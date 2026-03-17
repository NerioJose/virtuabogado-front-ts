import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';
import { UserRole } from '@/shared/types/entities.types';

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

        // 2. Fallback: Dev Bypass Cookie (Solo para desarrollo)
        if (!user) {
            const devBypass = request.headers.get('cookie')?.includes('virtuabogado-dev-bypass=true');
            if (devBypass) {
                user = { id: 'dev-bypass-admin', email: 'admin@dev.test' } as any;
                console.log('🚧 Lawyers API: Auth bypass via Dev Cookie');
            }
        }

        if (!user) {
            console.warn('⚠️ API GET /lawyers: User not found in session');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Verificar rol (Saltar si es bypass)
        if (user.id !== 'dev-bypass-admin') {
            const { data: userData } = await supabase
                .from('User')
                .select('rol')
                .eq('id', user.id)
                .single();

            if (userData?.rol !== 'ADMIN') {
                return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
            }
        }

        const lawyers = await prisma.user.findMany({
            where: {
                rol: UserRole.ABOGADO,
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
