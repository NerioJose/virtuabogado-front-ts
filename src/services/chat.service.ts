import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

export interface ChatAuth {
    user: { id: string; email?: string };
    role: string;
}

export async function getChatAuth(): Promise<ChatAuth | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    let role = (user.user_metadata?.rol as string) || '';
    if (!role) {
        const userData = await prisma.user.findUnique({
            where: { id: user.id },
            select: { rol: true }
        });
        role = userData?.rol || 'CLIENTE';
    }

    return { user: { id: user.id, email: user.email }, role: role.toUpperCase() };
}

export async function checkChatAccess(orderId: string, userId: string, role: string): Promise<boolean> {
    if (role === 'ADMIN') return true;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { userId: true, lawyerId: true }
    });

    if (!order) return false;
    return order.userId === userId || order.lawyerId === userId;
}
