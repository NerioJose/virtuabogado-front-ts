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
                    console.log('✅ Clients API: Auth success via Authorization header');
                }
            }
        }

        // 2. Fallback: Dev Bypass Cookie (Solo para desarrollo)
        if (!user) {
            const devBypass = request.headers.get('cookie')?.includes('virtuabogado-dev-bypass=true');
            if (devBypass) {
                // Simular un usuario admin para que pase la validación de la API
                // NOTA: Esto no autentica la instancia de Supabase, por lo que RLS aún puede afectar
                user = { id: 'dev-bypass-admin', email: 'admin@dev.test' } as any;
                console.log('🚧 Clients API: Auth bypass via Dev Cookie');
            }
        }

        if (!user) {
            console.warn('⚠️ API GET /clients: User not found in session');
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // Obtener rol del usuario (Saltar si es bypass)
        if (user.id !== 'dev-bypass-admin') {
            const { data: userData } = await supabase
                .from('User')
                .select('rol')
                .eq('id', user.id)
                .single();

            if (userData?.rol !== 'ADMIN' && userData?.rol !== 'ABOGADO') {
                return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
            }
        }

        const clients = await prisma.user.findMany({
            where: {
                rol: UserRole.CLIENTE,
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
        const formattedClients = clients.map((client: any) => ({
            id: client.id,
            nombre: client.nombre,
            email: client.email,
            telefono: client.telefono || undefined,
            direccion: client.direccion || undefined,
            dni: client.dni || undefined,
            status: 'active', // Default
            createdAt: client.createdAt,
            updatedAt: client.updatedAt,
            serviciosContratados: client.orders.length,
            totalGastado: client.orders.reduce((sum: number, order: any) => sum + Number(order.total), 0),
        }));

        return NextResponse.json(formattedClients);
    } catch (error) {
        console.error('❌ API Error fetching clients:', error);
        return NextResponse.json(
            { error: 'Error al obtener los clientes' },
            { status: 500 }
        );
    }
}
