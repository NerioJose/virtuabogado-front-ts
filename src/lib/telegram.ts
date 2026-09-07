const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const API_BASE = 'https://api.telegram.org';

export interface TelegramSendResult {
    ok: boolean;
    error?: string;
}

/**
 * Envía un mensaje de texto a un chat de Telegram.
 * Devuelve el estado del envío; detecta 403 (bot bloqueado / chat inexistente)
 * para que el usuario pueda re-vincular su chat.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<TelegramSendResult> {
    if (!BOT_TOKEN) {
        return { ok: false, error: 'TELEGRAM_BOT_TOKEN no configurado' };
    }
    if (!chatId) {
        return { ok: false, error: 'chat_id vacío' };
    }

    try {
        const response = await fetch(`${API_BASE}/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
                disable_web_page_preview: false,
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (data?.ok) {
            return { ok: true };
        }

        // 403 = bot bloqueado por el usuario o chat no iniciado/inválido
        if (response.status === 403) {
            console.warn(`⚠️ [Telegram] 403 enviando a ${chatId}: ${data?.description || 'bloqueado/chat no válido'}`);
            return { ok: false, error: 'Bot bloqueado o chat no válido. Pulsa "Start" en el bot y re-vincula tu ID.' };
        }

        console.error(`❌ [Telegram] Error enviando a ${chatId}:`, data?.description || response.statusText);
        return { ok: false, error: data?.description || 'Error al enviar el mensaje' };
    } catch (error) {
        console.error('❌ [Telegram] Error de red:', error);
        return { ok: false, error: 'Error de red al enviar a Telegram' };
    }
}

/**
 * Escapa texto para HTML (parse_mode HTML de Telegram).
 */
function esc(text: string): string {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Mensajes formateados con la identidad de VirtuAbogado.
 */
export function buildTelegramMessage(title: string, body: string, url?: string): string {
    const appUrl = url ? url : process.env.NEXT_PUBLIC_APP_URL || 'https://virtuabogado.vercel.app';
    const link = url?.startsWith('http') ? url : `${appUrl}${url || ''}`;

    return [
        `<b>⚖️ VirtuAbogado</b>`,
        ``,
        `<b>${esc(title)}</b>`,
        ``,
        esc(body),
        ...(url ? [``, `<a href="${esc(link)}">Ver en la plataforma →</a>`] : []),
    ].join('\n');
}
