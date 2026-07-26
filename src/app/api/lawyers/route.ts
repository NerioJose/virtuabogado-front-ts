import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { UserRole } from '@/shared/types/entities.types';
import { serializeFinance } from '@/lib/finance';
import { getCached, setCache, clearCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

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
                console.warn('⚠️ API GET /lawyers: User not found in session');
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
        

        if (role !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
        const skip = (page - 1) * limit;
        const cacheKey = `lawyers-${page}-${limit}`;

        const cached = getCached<any>(cacheKey);
        if (cached) return NextResponse.json(cached);

        const [allUsers, total] = await Promise.all([
            prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count(),
        ]);

        const lawyers = allUsers.filter((u: any) => u.rol?.toUpperCase() === 'ABOGADO' || u.rol === 'ABOGADO');

        const formattedLawyers = lawyers.map((lawyer: any) => ({
            id: lawyer.id,
            nombre: lawyer.nombre || 'Abogado Sin Nombre',
            email: lawyer.email || 'N/A',
            telefono: lawyer.telefono || undefined,
            especialidad: (lawyer.especialidad || 'General').toLowerCase(),
            status: lawyer.activo ? 'ACTIVO' : 'INACTIVO', 
            matricula: lawyer.matricula || undefined,
            experiencia: lawyer.experiencia || undefined,
            casosActivos: 0,
            casosCompletados: 0,
            rating: 5,
            createdAt: lawyer.createdAt,
            updatedAt: lawyer.updatedAt,
        }));

        const response = serializeFinance({
            data: formattedLawyers,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        });
        setCache(cacheKey, response, 10_000);
        return NextResponse.json(response);
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

        userRole = userRole?.toUpperCase();

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
        const tempPassword = body.password || crypto.randomBytes(12).toString('hex');
        
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
                
                // Actualizar metadatos y contraseña si se proporcionó
                const updateData: any = {
                    user_metadata: { ...existingUser.user_metadata, rol: 'ABOGADO', nombre }
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

        

        return NextResponse.json(newLawyer);
    } catch (error: any) {
        console.error('❌ API Error creating lawyer:', error);
        return NextResponse.json(
            { error: 'Error al crear el abogado: ' + (error.message || 'Desconocido') },
            { status: 500 }
        );
    }
}
