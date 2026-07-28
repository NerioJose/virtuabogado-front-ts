import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { UserRole } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';
import { getCached, setCache, clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const headerId = request.headers.get('x-user-id');
        const headerRole = request.headers.get('x-user-role');

        let user: any;
        let userRole: string | undefined;

        if (headerId) {
            user = { id: headerId, email: request.headers.get('x-user-email') || '' };
            userRole = headerRole ?? undefined;
        } else {
            const supabase = await createClient();
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            if (!supabaseUser) {
                console.warn('⚠️ API GET /clients: User not found in session');
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            }
            user = supabaseUser;
            userRole = user.user_metadata?.rol;
        }

        userRole = userRole?.toUpperCase();

        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }

        if (!userRole) {
            return NextResponse.json({ error: 'Rol no definido' }, { status: 403 });
        }

        const role: string = userRole;
        

        if (role !== 'ADMIN' && role !== 'ABOGADO') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const skip = (page - 1) * limit;
        const cacheKey = `clients-${page}-${limit}`;

        const cached = getCached<any>(cacheKey);
        if (cached) return NextResponse.json(cached);

        const [clients, total, allOrders] = await Promise.all([
            prisma.user.findMany({
                where: { rol: UserRole.CLIENTE },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where: { rol: UserRole.CLIENTE } }),
            prisma.order.findMany({
                where: { activo: true },
                select: { userId: true, total: true, id: true }
            }),
        ]);

        const orderStatsMap = new Map<string, { count: number; total: number }>();
        for (const order of allOrders) {
            const stats = orderStatsMap.get(order.userId) || { count: 0, total: 0 };
            stats.count++;
            stats.total += Number(order.total);
            orderStatsMap.set(order.userId, stats);
        }

        const formattedClients = clients.map((client: any) => {
            const stats = orderStatsMap.get(client.id) || { count: 0, total: 0 };
            return {
                id: client.id,
                nombre: client.nombre || 'Cliente Sin Nombre',
                email: client.email || 'N/A',
                telefono: client.telefono || undefined,
                direccion: client.direccion || undefined,
                dni: client.dni || undefined,
                status: client.activo ? 'active' : 'inactive', 
                createdAt: client.createdAt,
                updatedAt: client.updatedAt,
                serviciosContratados: stats.count,
                totalGastado: stats.total,
            };
        });

        const response = serializeFinance({
            data: formattedClients,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
        setCache(cacheKey, response, 10_000);
        return NextResponse.json(response);
    } catch (error) {
        console.error('❌ API Error fetching clients:', error);
        return NextResponse.json(
            { error: 'Error al obtener los clientes' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const headerId = request.headers.get('x-user-id');
        const headerRole = request.headers.get('x-user-role');

        let adminUser: any;
        let userRole: string | undefined;

        if (headerId) {
            adminUser = { id: headerId, email: request.headers.get('x-user-email') || '' };
            userRole = headerRole ?? undefined;
        } else {
            const supabase = await createClient();
            const { data: { user: supabaseUser } } = await supabase.auth.getUser();
            if (!supabaseUser) {
                return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            }
            adminUser = supabaseUser;
            userRole = adminUser.user_metadata?.rol;
        }

        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: adminUser.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }

        if (userRole !== 'ADMIN' && userRole !== 'ABOGADO') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        const body = await request.json();
        const { email, nombre, telefono, direccion, dni } = body;

        if (!email || !nombre) {
            return NextResponse.json({ error: 'Email y nombre son requeridos' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        let userId: string;

        // 1. Intentar crear en Supabase Auth
        const tempPassword = body.password || crypto.randomBytes(12).toString('hex');
        
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { rol: 'CLIENTE', nombre },
            password: tempPassword
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                // El usuario ya existe en Auth, buscar su ID
                const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers();
                if (listError) return NextResponse.json({ error: 'Error al verificar usuario existente' }, { status: 500 });
                
                const existingUser = usersData.users.find((u: any) => u.email === email);
                if (!existingUser) return NextResponse.json({ error: 'Usuario no encontrado tras conflicto' }, { status: 500 });
                
                userId = existingUser.id;

                // Actualizar metadatos y contraseña si se proporcionó
                const updateData: any = {
                    user_metadata: { ...existingUser.user_metadata, rol: 'CLIENTE', nombre }
                };
                if (body.password) {
                    updateData.password = body.password;
                }

                await adminClient.auth.admin.updateUserById(userId, updateData);
            } else {
                console.error('❌ Supabase Auth error:', authError);
                return NextResponse.json({ error: authError.message }, { status: 400 });
            }
        } else {
            userId = authData.user.id;
        }

        // 2. Crear o actualizar en Prisma User table
        const newClient = await prisma.user.upsert({
            where: { email },
            update: {
                nombre,
                rol: 'CLIENTE',
                telefono,
                direccion,
                dni,
                activo: true
            },
            create: {
                id: userId,
                email,
                nombre,
                rol: 'CLIENTE',
                telefono,
                direccion,
                dni,
                activo: true
            }
        });

        

        return NextResponse.json(newClient);
    } catch (error: any) {
        console.error('❌ API Error creating client:', error);
        return NextResponse.json(
            { error: 'Error al crear el cliente: ' + (error.message || 'Desconocido') },
            { status: 500 }
        );
    }
}
