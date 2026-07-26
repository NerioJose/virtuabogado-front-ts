import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFinancialSettingsCached } from '@/lib/getFinancialSettings';
import { calculateOrderFinances } from '@/services/finance.service';
import { emit } from '@/events/eventBus';
import { serializeFinance } from '@/lib/finance';
import { UserRole, OrderStatus } from '@/shared/types/entities.types';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: Request) {
    try {
        const headerRole = request.headers.get('x-user-role');
        if (headerRole !== 'ADMIN') {
            const supabase = await (await import('@/utils/supabase/server')).createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || ((user.user_metadata?.rol as string) || '').toUpperCase() !== 'ADMIN') {
                return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
            }
        }

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
            if (!body.password) {
                return NextResponse.json({ error: 'Debe asignar una contraseña para el nuevo cliente' }, { status: 400 });
            }
            const supabaseAdmin = createAdminClient();
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password: String(body.password),
                email_confirm: true,
                user_metadata: {
                    nombre: nombre || email.split('@')[0],
                    rol: UserRole.CLIENTE,
                }
            });
            if (authError) {
                console.error('Error creating auth user:', authError);
                throw new Error(authError.message);
            }
            const newUser = await prisma.user.create({
                data: {
                    id: authData.user.id,
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
            // Es un nombre personalizado — crear el servicio con ID explícito
            serviceName = servicio.trim();
            const existing = await prisma.service.findFirst({ where: { titulo: serviceName } });
            if (existing) {
                serviceId = existing.id;
            } else {
                const maxResult = await prisma.service.aggregate({ _max: { id: true } });
                const newId = (maxResult._max.id || 0) + 1;
                const newService = await prisma.service.create({
                    data: {
                        id: newId,
                        titulo: serviceName,
                        descripcion: `Servicio creado por admin para caso manual`,
                        precio: Number(total),
                        activo: false,
                    }
                });
                serviceId = newService.id;
            }
        } else {
            return NextResponse.json({ error: 'Debe especificar un servicio válido' }, { status: 400 });
        }

        // 3. Obtener configuración financiera (con caché compartido)
        const settings = await getFinancialSettingsCached();

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

        // 7. Emitir eventos para broadcast y notificaciones
        const events: Promise<void>[] = [
            emit({
                type: 'order.created',
                data: { orderId: order.id, userId, serviceId, total: Number(total), status: finalStatus },
            }),
        ];

        if (targetLawyerId) {
            events.push(emit({
                type: 'order.assigned',
                data: { orderId: order.id, lawyerId: targetLawyerId, userId, serviceName },
            }));
        }

        await Promise.all(events);

        return NextResponse.json(serializeFinance(order));
    } catch (error) {
        console.error('Error creating order from admin:', error);
        return NextResponse.json({ error: 'Error al crear el caso' }, { status: 500 });
    }
}
