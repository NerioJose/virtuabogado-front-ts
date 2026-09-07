import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/utils/supabase/server';

/**
 * GET  /api/notifications/telegram/chat  → devuelve el chat_id actual del usuario.
 * POST /api/notifications/telegram/chat  → guarda/actualiza (o elimina) el chat_id.
 *
 * Solo ADMIN y ABOGADO pueden vincular un chat de Telegram.
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { telegramChatId: true },
        });

        return NextResponse.json({ telegramChatId: dbUser?.telegramChatId || null });
    } catch (error) {
        console.error('❌ Error GET telegram/chat:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const raw = String(body?.telegramChatId ?? '').trim();

        // Borrar el vínculo si llega vacío
        if (!raw) {
            await prisma.user.update({
                where: { id: user.id },
                data: { telegramChatId: null },
            });
            return NextResponse.json({ success: true, telegramChatId: null });
        }

        // Validación básica: el chat_id de Telegram es numérico (positivo)
        const isValid = /^-?\d+$/.test(raw);
        if (!isValid) {
            return NextResponse.json(
                { error: 'ID de chat inválido. Debe ser numérico (lo obtienes con @userinfobot).' },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { telegramChatId: raw },
        });

        return NextResponse.json({ success: true, telegramChatId: raw });
    } catch (error) {
        console.error('❌ Error POST telegram/chat:', error);
        return NextResponse.json({ error: 'Error interno' }, { status: 500 });
    }
}
