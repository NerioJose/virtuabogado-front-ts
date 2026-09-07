import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'virtuabogado_bot';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * Webhook de Telegram para el bot de notificaciones.
 * Responde a /start (y a cualquier mensaje) con un mensaje de bienvenida
 * que incluye el chat_id del usuario, para que lo pegue en su perfil.
 */
export async function POST(request: NextRequest) {
    // Verificación de origen (secret_token configurado en setWebhook)
    if (WEBHOOK_SECRET) {
        const header = request.headers.get('x-telegram-bot-api-secret-token');
        if (header !== WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
    }

    try {
        const update = await request.json();

        const message = update?.message || update?.edited_message;
        if (!message || !message.chat?.id) {
            // No es un mensaje de chat (pueden ser otros updates). Responder OK igual.
            return NextResponse.json({ ok: true });
        }

        const chatId = String(message.chat.id);
        const text = String(message.text || '').trim().toLowerCase();

        if (text === '/start' || text === '/help' || !text) {
            const welcome = [
                '¡Hola! 👋 Soy el bot de notificaciones de <b>VirtuAbogado</b> ⚖️',
                '',
                `Tu <b>ID de chat</b> es: <code>${chatId}</code>`,
                '',
                'Para recibir avisos de nuevos casos y pagos:',
                '1️⃣ Cópialo.',
                `2️⃣ Pégalo en tu perfil de VirtuAbogado (Admin → Ajustes → Notificaciones, o Abogado → Mi Perfil → Telegram).`,
                '3️⃣ Guarda. ¡Listo! 🎉',
            ].join('\n');

            await sendTelegramMessage(chatId, welcome);
        } else {
            // Cualquier otro mensaje: recordar el ID por si lo borraron
            await sendTelegramMessage(
                chatId,
                `Tu <b>ID de chat</b> es: <code>${chatId}</code>\n\nPégalo en tu perfil de VirtuAbogado para recibir notificaciones.\nBot: @${BOT_USERNAME}`,
            );
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('❌ Error en webhook de Telegram:', error);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
