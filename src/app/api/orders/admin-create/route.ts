import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FINANCIAL_SETTINGS_ID } from '@/lib/constants';
import { calculateOrderFinances } from '@/services/finance.service';
import { broadcastOrderUpdate } from '@/lib/broadcast';
import { notifyNewSale, notifyNewCase } from '@/lib/push-notifications';
import { serializeFinance } from '@/lib/finance';
import { UserRole, OrderStatus } from '@/shared/types/entities.types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, nombre, telefono, servicio, total } = body;

        if (!email || !total) {
            return NextResponse.json({ error: 'Email y total son requeridos' }, { status: 400 });
        }

        // 1. Buscar o crear el usuario por email
        const existingUser = await prisma.user.findUnique({ where: { email } });
        let userId: string;

        if (existingUser) {
            userId = existingUser.id;
        } else {
            const newUser = await prisma.user.create({
                data: {
                    email,
                    nombre: nombre || email.split('@')[0],
                    telefono: telefono || '',
                    rol: UserRole.CLIENTE,
                    activo: true,
                }
            });
            userId = newUser.id;
        }

        // 2. Resolver el servicio (ID existente o nombre personalizado)
        let serviceId: number;
        let serviceName = 'Servicio personalizado';

        const servicioNum = Number(servicio);
        if (!isNaN(servicioNum) && servicioNum > 0) {
            // Es un ID numérico de servicio existente
            const serviceRecord = await prisma.service.findUnique({ where: { id: servicioNum } });
            if (serviceRecord) {
                serviceId = serviceRecord.id;
                serviceName = serviceRecord.titulo;
            } else {
                return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
            }
        } else if (typeof servicio === 'string' && servicio.trim()) {
            // Es un nombre personalizado — usar el primer servicio disponible como referencia
            serviceName = servicio.trim();
            const firstService = await prisma.service.findFirst({ orderBy: { id: 'asc' } });
            serviceId = firstService?.id || 1;
        } else {
            return NextResponse.json({ error: 'Debe especificar un servicio válido' }, { status: 400 });
        }

        // 3. Obtener configuración financiera
        const settings = await prisma.financialSettings.findUnique({
            where: { id: FINANCIAL_SETTINGS_ID }
        }) || {
            lawyer_commission_percentage: 70,
            operational_costs_percentage: 10,
            tax_percentage: 15,
            platform_fee_percentage: 5,
        };

        // 4. Calcular split financiero
        const split = calculateOrderFinances(total, settings);

        // 5. Buscar abogados activos para auto-asignación
        const activeLawyers = await prisma.user.findMany({
            where: { rol: UserRole.ABOGADO, activo: true },
            select: { id: true, nombre: true }
        });

        const isAutoAssign = activeLawyers.length === 1;
        const targetLawyerId = isAutoAssign ? activeLawyers[0].id : null;
        const finalStatus = targetLawyerId ? OrderStatus.EN_PROGRESO : OrderStatus.PENDIENTE;

        // 6. Crear la orden
        const order = await prisma.order.create({
            data: {
                userId,
                serviceId,
                total: Number(total),
                status: finalStatus,
                lawyerId: targetLawyerId,
                assignedAt: isAutoAssign ? new Date() : null,
                commissionAmount: split.comisionAbogado,
                operationalCostAmount: split.gastosOperativos,
                taxAmount: split.impuestos,
                platformFeeAmount: split.platformFee,
                netProfitAmount: split.netoPlataforma,
                paymentId: `ADMIN-${Date.now()}`,
            },
            include: {
                user: { select: { nombre: true } },
                service: { select: { titulo: true } },
            }
        });

        // 7. Broadcast en tiempo real
        broadcastOrderUpdate({
            orderId: order.id,
            userId: order.userId,
            lawyerId: targetLawyerId || undefined,
            status: finalStatus,
            eventType: 'updated',
        }).catch((e: unknown) => console.error('Broadcast error:', e));

        // 8. Notificaciones push
        const clientName = order.user?.nombre || 'Cliente';
        const serviceDisplay = serviceName;

        notifyNewSale(order.id, order.total.toString(), !targetLawyerId, clientName, serviceDisplay)
            .catch((e: unknown) => console.error('Push error:', e));

        if (targetLawyerId) {
            notifyNewCase(targetLawyerId, order.id, serviceDisplay)
                .catch((e: unknown) => console.error('Push error:', e));
        }

        return NextResponse.json(serializeFinance(order));
    } catch (error) {
        console.error('Error creating order from admin:', error);
        return NextResponse.json({ error: 'Error al crear el caso' }, { status: 500 });
    }
}
