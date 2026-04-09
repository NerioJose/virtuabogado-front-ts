import { NextRequest, NextResponse } from 'next/server';
import { prisma as prismaClient } from '@/lib/prisma';
const prisma = prismaClient as any;
import { OrderStatus } from '@/shared/types/entities.types';
import { broadcastOrderUpdate } from '@/lib/broadcast';
import { Webhook } from 'svix';
import { revalidatePath } from 'next/cache';
import { notifyNewSale, notifyNewCase } from '@/lib/push-notifications';

export async function POST(req: NextRequest) {
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');
    
    if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: 'Missing Svix headers' }, { status: 401 });
    }

    const secret = process.env.ZENOBANK_WEBHOOK_SECRET;
    if (!secret) {
        console.error('❌ [Webhook] ZENOBANK_WEBHOOK_SECRET no configurado');
        return NextResponse.json({ error: 'Configuración incompleta' }, { status: 500 });
    }

    const payload = await req.text();
    const headers = {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
    };

    const wh = new Webhook(secret);
    let evt: any;

    try {
        evt = wh.verify(payload, headers);
    } catch (err) {
        console.error('🚨 [Webhook] Firma SVIX inválida:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const { type, data } = evt; 
    const orderId = data?.orderId || evt.orderId;
    const paymentId = data?.id || evt.id;

    console.log(`✅ [Webhook SVIX] Evento verificado: ${type} para orden ${orderId}`);

    try {
        const currentOrder = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: { select: { nombre: true } },
                service: { select: { titulo: true } },
            }
        });

        if (!currentOrder) {
            console.warn(`⚠️ [Webhook] Orden ${orderId} no encontrada.`);
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Si ya está pagada o completada, ignoramos para evitar loops
        if (currentOrder.status === OrderStatus.PAID || currentOrder.status === OrderStatus.COMPLETADO) {
            console.log(`⏭️ [Webhook] Orden ${orderId} ya procesada. Ignorando.`);
            return NextResponse.json({ received: true, status: 'already_processed' });
        }

        if (type === 'checkout.completed' || type === 'payment.succeeded') {
            console.log(`[CheckoutFlow] 💳 Procesando pago exitoso para Orden: ${orderId}`);

            // ⚛️ TRANSACCIÓN ATÓMICA: Dos fases separadas para máxima resiliencia
            const result = await (prisma as any).$transaction(async (tx: any) => {
                // ── FASE 1 (CRÍTICA): Confirmar el pago. NUNCA puede fallar. ──
                const order = await tx.order.update({
                    where: { id: orderId },
                    data: {
                        status: 'PAID',
                        paymentId: paymentId,
                    }
                });

                let targetLawyerId = order.lawyerId;
                let finalStatus = 'PAID';
                let isAutoAssigned = false;

                // ── FASE 2 (RESILIENTE): Auto-asignación. Si falla, el pago sigue confirmado. ──
                if (!targetLawyerId) {
                    try {
                        // Buscar abogados activos (case-insensitive para robustez)
                        const activeLawyers = await tx.user.findMany({
                            where: { rol: 'ABOGADO', activo: true },
                            select: { id: true, nombre: true }
                        });

                        // Fallback: si 0 activos, buscar cualquier abogado registrado
                        const allLawyers = activeLawyers.length > 0 ? activeLawyers : await tx.user.findMany({
                            where: { rol: 'ABOGADO' },
                            select: { id: true, nombre: true }
                        });

                        console.log(`[CheckoutFlow] ⚖️ Abogados disponibles: activos=${activeLawyers.length}, total=${allLawyers.length}`);

                        if (allLawyers.length === 1) {
                            // Exactamente un abogado → auto-asignación automática
                            targetLawyerId = allLawyers[0].id;
                            isAutoAssigned = true;
                            finalStatus = 'EN_PROGRESO';
                            console.log(`[CheckoutFlow] ✅ Auto-asignación: ${allLawyers[0].nombre}`);

                            await tx.order.update({
                                where: { id: orderId },
                                data: {
                                    status: finalStatus,
                                    lawyerId: targetLawyerId,
                                    assignedAt: new Date()
                                }
                            });
                        } else if (allLawyers.length > 1) {
                            // Más de uno → queda en PAID, asignación manual requerida
                            console.log(`[CheckoutFlow] ⚖️ ${allLawyers.length} abogados. Asignación manual requerida.`);
                        }
                    } catch (assignErr: any) {
                        // ⚠️ PROTECCIÓN: La asignación falla, pero el PAGO ya está confirmado.
                        // El admin verá la orden en estado PAID para asignar manualmente.
                        console.error(`[CheckoutFlow] ⚠️ Auto-asignación falló (pago ya confirmado):`, assignErr.message);
                    }
                } else {
                    // Ya tenía abogado asignado → pasar a EN_PROGRESO
                    finalStatus = 'EN_PROGRESO';
                    await tx.order.update({
                        where: { id: orderId },
                        data: { status: finalStatus }
                    });
                }

                return { targetLawyerId, resolvedStatus: finalStatus, isAutoAssigned };
            }, { timeout: 15000 });

            const { targetLawyerId, resolvedStatus } = result;

            // 📡 BROADCAST REACTIVO: await garantiza que el serverless no muera antes de enviar
            // Esto activa la transición de "Casi listo" → "/mis-servicios" en el cliente
            console.log(`[CheckoutFlow] 📡 Emitiendo broadcast await: status=${resolvedStatus}`);
            await broadcastOrderUpdate({
                orderId: orderId,
                userId: currentOrder.userId,
                lawyerId: targetLawyerId,
                status: resolvedStatus,
                eventType: 'updated'
            });

            // Extraer datos contextuales para notificaciones enriquecidas
            const clientName = (currentOrder as any).user?.nombre;
            const serviceName = (currentOrder as any).service?.titulo;

            // 🔔 NOTIFICACIONES PUSH: Canal Admin (siempre)
            console.log(`💰 [Webhook Push] Notificando pago a Admins...`);
            await notifyNewSale(orderId, currentOrder.total.toString(), !targetLawyerId, clientName, serviceName).catch(err =>
                console.error('❌ Error enviando push de venta:', err)
            );

            // 🔔 NOTIFICACIONES PUSH: Canal Abogado (si hubo asignación)
            if (targetLawyerId) {
                console.log(`⚖️ [Webhook Push] Notificando asignación al Abogado: ${targetLawyerId}`);
                await notifyNewCase(targetLawyerId, orderId, serviceName).catch(err =>
                    console.error('❌ Error enviando push de asignación:', err)
                );
            }

            // 🚀 LIMPIEZA DE CACHÉ NEXT.JS
            revalidatePath('/', 'layout');

            console.log(`✅ [Webhook] Finalizado con éxito para Orden ${orderId}`);

        } else if (['payment.failed', 'checkout.expired', 'checkout.canceled'].includes(type)) {
            await prisma.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.PAGO_RECHAZADO }
            });
            console.warn(`❌ [Webhook] Orden ${orderId} rechazada.`);
        }

        return NextResponse.json({ received: true, status: 'processed' });
    } catch (error) {
        console.error('❌ [Webhook] Error interno:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
