import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * One-time migration endpoint: marks all PENDIENTE payouts as COMPLETADO.
 * Only accessible by ADMIN.
 * Call once via: GET /api/admin/fix-payouts
 */
export async function GET(request: Request) {
    try {
        const headerId = request.headers.get('x-user-id');
        const headerRole = request.headers.get('x-user-role');

        let userRole = headerRole;
        if (!userRole) {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
            const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { rol: true } });
            userRole = dbUser?.rol || null;
        }

        if (userRole !== 'ADMIN') {
            return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
        }

        // Update all PENDIENTE payouts to COMPLETADO
        const result = await (prisma as any).lawyerPayout.updateMany({
            where: { status: 'PENDIENTE' },
            data: {
                status: 'COMPLETADO',
                paidAt: new Date()
            }
        });

        return NextResponse.json({
            success: true,
            message: `${result.count} liquidaciones actualizadas a COMPLETADO.`,
            count: result.count
        });
    } catch (error) {
        console.error('Error fixing payouts:', error);
        return NextResponse.json({ error: 'Error al actualizar las liquidaciones.' }, { status: 500 });
    }
}
