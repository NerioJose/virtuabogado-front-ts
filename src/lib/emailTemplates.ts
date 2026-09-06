import { transporter } from './nodemailer';

/**
 * Envía el correo de confirmación de cuenta (CLIENTE).
 * Usa la misma plantilla visual que el correo de recuperación de contraseña,
 * adaptada al contexto de confirmación de correo.
 */
export async function sendConfirmationEmail(params: {
    to: string;
    nombre: string;
    confirmUrl: string;
}) {
    const { to, nombre, confirmUrl } = params;
    const GMAIL_USER = process.env.GMAIL_USER;

    await transporter.sendMail({
        from: `"VirtuAbogado" <${GMAIL_USER}>`,
        to,
        subject: 'Confirma tu correo en VirtuAbogado ✉️',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
                    .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                    .header { background-color: #1961a0; padding: 40px; text-align: center; }
                    .content { padding: 48px; text-align: center; }
                    .title { color: #0f172a; font-size: 24px; font-weight: 900; margin-bottom: 16px; letter-spacing: -0.025em; }
                    .text { color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
                    .button { display: inline-block; background-color: #1961a0; color: #ffffff !important; padding: 18px 36px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 0 10px 20px -5px rgba(25, 97, 160, 0.3); }
                    .footer { padding: 32px; background-color: #f1f5f9; text-align: center; }
                    .footer-text { color: #94a3b8; font-size: 12px; margin: 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="color: white; margin: 0; font-weight: 900;">VirtuAbogado</h1>
                    </div>
                    <div class="content">
                        <h2 class="title">Confirmación de Correo</h2>
                        <p class="text">Hola ${nombre}, estamos a un paso de activar tu cuenta. Haz clic en el botón de abajo para confirmar tu correo:</p>
                        <a href="${confirmUrl}" class="button">Confirmar mi Correo</a>
                        <p style="margin-top: 32px; color: #94a3b8; font-size: 13px;">Este enlace es válido por 24 horas.</p>
                    </div>
                    <div class="footer">
                        <p class="footer-text">© ${new Date().getFullYear()} VirtuAbogado.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    });
}