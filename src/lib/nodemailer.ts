import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

/**
 * Transporter de Nodemailer para VirtuAbogado 📧
 * Configurado para usar Gmail SMTP con Contraseña de Aplicación.
 */
export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
    }
});

// Verificación de conexión opcional en logs de servidor
if (process.env.NODE_ENV === 'development') {
    transporter.verify((error) => {
        if (error) {
            console.error('❌ [Nodemailer] Error de conexión SMTP:', error);
        }
    });
}

export interface TransactionalMail {
    to: string;
    subject: string;
    html: string;
    text: string;
}

/**
 * Envía un correo transaccional con las cabeceras y el formato que
 * maximizan la entregabilidad (menos probabilidad de caer en spam):
 * - Remitente fijo de la cuenta Gmail.
 * - Versión en texto plano junto al HTML.
 * - Cabecera List-Unsubscribe (señal anti-bulk).
 */
export async function sendTransactionalMail({ to, subject, html, text }: TransactionalMail): Promise<void> {
    await transporter.sendMail({
        from: `"VirtuAbogado" <${GMAIL_USER}>`,
        replyTo: GMAIL_USER,
        to,
        subject,
        html,
        text,
        headers: {
            'List-Unsubscribe': `<mailto:${GMAIL_USER}?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
    });
}
