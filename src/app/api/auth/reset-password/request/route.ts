import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resend } from '@/lib/resend';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'El correo es obligatorio' }, { status: 400 });
        }

        console.log('📨 API RECIBIDA EN SERVIDOR PARA:', email);

        // 1. Verificar si el usuario existe (opcional, pero recomendado para evitar spam a correos inexistentes)
        // Por seguridad, a veces se dice "Correo enviado" aunque no exista, pero aquí seremos internos.
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            // No revelamos si el usuario existe o no por seguridad (Email Harvesting)
            return NextResponse.json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación pronto.' });
        }

        // 2. Generar Token Único
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // 3. Guardar en Base de Datos
        await prisma.passwordResetToken.create({
            data: {
                email,
                token,
                expiresAt
            }
        });

        // 4. Enviar Email vía Resend Elite Design
        const origin = new URL(request.url).origin;
        const resetLink = `${origin}/auth/reset-password?token=${token}`;
        
        await resend.emails.send({
            from: 'VirtuAbogado <onboarding@resend.dev>', // 🚨 NOTA: Cambiar a no-reply@tudominio.com cuando verifiques dominio
            replyTo: 'virtuabogado.legal@gmail.com',
            to: email,
            subject: 'Restablece tu contraseña en VirtuAbogado 🔒',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
                        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
                        .header { background-color: #1961a0; padding: 40px; text-align: center; }
                        .logo { height: 40px; margin-bottom: 20px; }
                        .content { padding: 48px; text-align: center; }
                        .title { color: #0f172a; font-size: 24px; font-weight: 900; margin-bottom: 16px; letter-spacing: -0.025em; }
                        .text { color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
                        .button { display: inline-block; background-color: #1961a0; color: #ffffff !important; padding: 18px 36px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; box-shadow: 0 10px 20px -5px rgba(25, 97, 160, 0.3); transition: all 0.2s; }
                        .footer { padding: 32px; background-color: #f1f5f9; text-align: center; border-bottom-left-radius: 24px; border-bottom-right-radius: 24px; }
                        .footer-text { color: #94a3b8; font-size: 12px; margin: 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1 style="color: white; margin: 0; font-weight: 900; tracking-tight: -0.05em;">VirtuAbogado</h1>
                        </div>
                        <div class="content">
                            <h2 class="title">Recuperación de Cuenta</h2>
                            <p class="text">Hemos recibido una solicitud para restablecer la contraseña de tu cuenta legal. Si no realizaste esta solicitud, puedes ignorar este mensaje de forma segura.</p>
                            <a href="${resetLink}" class="button">Restablecer Contraseña</a>
                            <p style="margin-top: 32px; color: #94a3b8; font-size: 13px;">Este enlace es válido por 15 minutos.</p>
                        </div>
                        <div class="footer">
                            <p class="footer-text">© ${new Date().getFullYear()} VirtuAbogado. Todos los derechos reservados.</p>
                            <p class="footer-text" style="margin-top: 8px;">Este es un mensaje automático, por favor no respondas directamente.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        return NextResponse.json({ message: 'Correo enviado correctamente' });

    } catch (error: any) {
        console.error('Error en request-reset:', error);
        return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
    }
}
