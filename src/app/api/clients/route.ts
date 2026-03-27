import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { UserRole } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        // Verificar autenticación
        let { data: { user }, error: authError } = await supabase.auth.getUser();

        // 1. Fallback: Check for Authorization header if cookies fail
        if (!user) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { data: { user: headerUser } } = await supabase.auth.getUser(token);
                if (headerUser) {
                    user = headerUser;
                    console.log('✅ Clients API: Auth success via Authorization header');
                }
            }
        }

        if (!user) {
            console.warn('⚠️ API GET /clients: User not found in session');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener rol del usuario
        let userRole: string | undefined = (user.user_metadata?.rol as string)?.toUpperCase();
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
        console.log(`🔍 [API Clients] Access granted. Role: ${role} for User: ${user.id}`);

        if (role !== 'ADMIN' && role !== 'ABOGADO') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        // 🏛️ RESCUE LOGIC: Fetch all users and filter in-memory to handle legacy casing (Enum validation safety)
        const allUsers = await prisma.user.findMany({
            where: { activo: true },
            include: { orders: true },
            orderBy: { createdAt: 'desc' }
        });

        const clients = allUsers.filter((u: any) => 
            u.rol?.toUpperCase() === 'CLIENTE'
        );

        // Mapear al formato que espera el frontend
        const formattedClients = clients.map((client: any) => ({
            id: client.id,
            nombre: client.nombre || 'Cliente Sin Nombre',
            email: client.email || 'N/A',
            telefono: client.telefono || undefined,
            direccion: client.direccion || undefined,
            dni: client.dni || undefined,
            status: 'active', // Default
            createdAt: client.createdAt,
            updatedAt: client.updatedAt,
            serviciosContratados: (client.orders || []).length,
            totalGastado: (client.orders || []).reduce((sum: number, order: any) => sum + Number(order.total || 0), 0),
        }));

        return NextResponse.json(serializeFinance(formattedClients));
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
        const supabase = await createClient();
        const { data: { user: adminUser } } = await supabase.auth.getUser();

        if (!adminUser) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar rol admin/abogado
        let userRole = adminUser.user_metadata?.rol;
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
        const tempPassword = `VirtuClient2024!_${Math.random().toString(36).slice(-4)}`;
        
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
                
                const existingUser = usersData.users.find(u => u.email === email);
                if (!existingUser) return NextResponse.json({ error: 'Usuario no encontrado tras conflicto' }, { status: 500 });
                
                userId = existingUser.id;

                // Actualizar metadatos del usuario existente para asegurar rol CLIENTE
                await adminClient.auth.admin.updateUserById(userId, {
                    user_metadata: { ...existingUser.user_metadata, rol: 'CLIENTE', nombre }
                });
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

        console.log('✅ Client created successfully:', newClient.id);

        return NextResponse.json(newClient);
    } catch (error: any) {
        console.error('❌ API Error creating client:', error);
        return NextResponse.json(
            { error: 'Error al crear el cliente: ' + (error.message || 'Desconocido') },
            { status: 500 }
        );
    }
}
