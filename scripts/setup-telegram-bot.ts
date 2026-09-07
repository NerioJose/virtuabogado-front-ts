/**
 * Script one-time para configurar la identidad del bot de Telegram
 * (nombre, descripción, descripción corta y comandos).
 *
 * Uso:
 *   TELEGRAM_BOT_TOKEN=123:ABC npx ts-node scripts/setup-telegram-bot.ts
 *
 * La foto de perfil se configura manualmente en @BotFather con /setuserpic
 * (subir public/logo/logo_white_512.png).
 */
import 'dotenv/config';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ Falta TELEGRAM_BOT_TOKEN en el entorno.');
    process.exit(1);
}

const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function api(method: string, params: Record<string, unknown>) {
    const res = await fetch(`${API}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok) {
        console.error(`  ❌ ${method}:`, data.description || data);
        return false;
    }
    console.log(`  ✅ ${method}`);
    return true;
}

async function main() {
    console.log('🛠️  Configurando identidad del bot VirtuAbogado...\n');

    await api('setMyName', { name: 'VirtuAbogado' });
    await api('setMyDescription', {
        description:
            'Asesorías online en Derecho y Gestión Legal.\nRecibirás aquí los avisos de nuevos casos y pagos de VirtuAbogado.',
    });
    await api('setMyShortDescription', {
        short_description: 'Notificaciones oficiales de VirtuAbogado ⚖️',
    });
    await api('setMyCommands', {
        commands: [
            { command: 'start', description: 'Vincular mi cuenta' },
            { command: 'help', description: 'Ayuda' },
        ],
    });

    console.log('\n✨ Identidad configurada. Recuerda subir la foto con /setuserpic en @BotFather.');
}

main();
