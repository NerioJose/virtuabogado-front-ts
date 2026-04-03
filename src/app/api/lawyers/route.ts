import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { UserRole } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';

export const dynamic = 'force-dynamic';

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
                    console.log('✅ Lawyers API: Auth success via Authorization header');
                }
            }
        }

        if (!user) {
            console.warn('⚠️ API GET /lawyers: User not found in session');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar rol
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
        console.log(`🔍 [API Lawyers] Access granted. Role: ${role} for User: ${user.id}`);

        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        console.log('🏛️ [API Lawyers] Fetching all users for administrative categorization...');
        const allUsers = await prisma.user.findMany({
            // REMOVED: where: { activo: true }, -> Allow Admin to see all lawyers (Active/Inactive)
            // REMOVED FOR STABILITY: include: { orders: true }, -> Avoid heavy join causing 500s
            orderBy: { createdAt: 'desc' }
        });

        const clients = allUsers.filter((u: any) => u.rol?.toUpperCase() === 'CLIENTE' || u.rol === 'CLIENTE');
        const lawyers = allUsers.filter((u: any) => u.rol?.toUpperCase() === 'ABOGADO' || u.rol === 'ABOGADO');

        console.log(`📊 [API Lawyers] Consolidated Results -> Clients: ${clients.length}, Lawyers: ${lawyers.length}`);

        // Mapear al formato que espera el frontend
        const formattedLawyers = lawyers.map((lawyer: any) => ({
            id: lawyer.id,
            nombre: lawyer.nombre || 'Abogado Sin Nombre',
            email: lawyer.email || 'N/A',
            telefono: lawyer.telefono || undefined,
            especialidad: (lawyer.especialidad || 'General').toLowerCase(),
            status: lawyer.activo ? 'ACTIVO' : 'INACTIVO', 
            matricula: lawyer.matricula || undefined,
            experiencia: lawyer.experiencia || undefined,
            casosActivos: 0, // Placeholder for stability
            casosCompletados: 0, // Placeholder for stability
            rating: 5,
            createdAt: lawyer.createdAt,
            updatedAt: lawyer.updatedAt,
        }));

        return NextResponse.json(serializeFinance(formattedLawyers));
    } catch (error) {
        console.error('❌ API Error fetching lawyers:', error);
        return NextResponse.json(
            { error: 'Error al obtener los abogados' },
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

        // Verificar rol admin
        let userRole: string | undefined = (adminUser.user_metadata?.rol as string)?.toUpperCase();
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: adminUser.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }

        if (userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        const body = await request.json();
        const { email, nombre, especialidad, matricula, colegiatura, telefono } = body;

        // Soporte para ambos nombres de campo
        const registrationNumber = matricula || colegiatura;

        if (!email || !nombre) {
            return NextResponse.json({ error: 'Email y nombre son requeridos' }, { status: 400 });
        }

        const adminClient = createAdminClient();
        let userId: string;

        // 1. Intentar crear en Supabase Auth
        const tempPassword = `VirtuLawyer2024!_${Math.random().toString(36).slice(-4)}`;
        
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { rol: 'ABOGADO', nombre },
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
                
                // Actualizar metadatos del usuario existente para asegurar rol ABOGADO
                await adminClient.auth.admin.updateUserById(userId, {
                    user_metadata: { ...existingUser.user_metadata, rol: 'ABOGADO', nombre }
                });
            } else {
                console.error('❌ Supabase Auth error:', authError);
                return NextResponse.json({ error: authError.message }, { status: 400 });
            }
        } else {
            userId = authData.user.id;
        }

        // 2. Crear o actualizar en Prisma User table
        const newLawyer = await prisma.user.upsert({
            where: { email },
            update: {
                nombre,
                rol: 'ABOGADO',
                especialidad: especialidad || 'General',
                matricula: registrationNumber,
                telefono,
                activo: true
            },
            create: {
                id: userId,
                email,
                nombre,
                rol: 'ABOGADO',
                especialidad: especialidad || 'General',
                matricula: registrationNumber,
                telefono,
                activo: true
            }
        });

        console.log('✅ Lawyer created successfully:', newLawyer.id);

        return NextResponse.json(newLawyer);
    } catch (error: any) {
        console.error('❌ API Error creating lawyer:', error);
        return NextResponse.json(
            { error: 'Error al crear el abogado: ' + (error.message || 'Desconocido') },
            { status: 500 }
        );
    }
}
