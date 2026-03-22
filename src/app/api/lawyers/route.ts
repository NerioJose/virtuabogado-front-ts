import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { UserRole } from '@/shared/types/entities.types';

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
        let userRole = user.user_metadata?.rol;
        if (!userRole) {
            const userData = await prisma.user.findUnique({
                where: { id: user.id },
                select: { rol: true }
            });
            userRole = userData?.rol;
        }

        if (userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        const lawyers = await prisma.user.findMany({
            where: {
                rol: 'ABOGADO' as any,
                activo: true
            },
            include: {
                orders: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        // Mapear al formato que espera el frontend
        const formattedLawyers = lawyers.map((lawyer: any) => ({
            id: lawyer.id,
            nombre: lawyer.nombre,
            email: lawyer.email,
            telefono: lawyer.telefono || undefined,
            especialidad: lawyer.especialidad || 'civil',
            status: 'ACTIVO', // Default for active users
            matricula: lawyer.matricula || undefined,
            experiencia: lawyer.experiencia || undefined,
            casosActivos: lawyer.orders.filter((o: any) => o.status === 'PENDIENTE').length,
            casosCompletados: lawyer.orders.filter((o: any) => o.status === 'COMPLETADO').length,
            rating: 5, // Mock por ahora
            createdAt: lawyer.createdAt,
            updatedAt: lawyer.updatedAt,
        }));

        return NextResponse.json(formattedLawyers);
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
        let userRole = adminUser.user_metadata?.rol;
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
                
                const existingUser = usersData.users.find(u => u.email === email);
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
