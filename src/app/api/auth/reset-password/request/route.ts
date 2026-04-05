import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { transporter } from '@/lib/nodemailer';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'El correo es obligatorio' }, { status: 400 });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const GMAIL_USER = process.env.GMAIL_USER;

        console.log('📨 [Password Reset] Solicitando vía Gmail para:', normalizedEmail);

        // 1. Verificar si el usuario existe y está ACTIVO (Case-Insensitive)
        const user = await prisma.user.findFirst({
            where: { 
                email: {
                    equals: normalizedEmail,
                    mode: 'insensitive'
                },
                activo: true // Solo permitir recuperación a cuentas activas
            }
        });

        if (!user) {
            console.warn(`⚠️ [Password Reset] Usuario no encontrado para: ${normalizedEmail}`);
            return NextResponse.json({ message: 'Si el correo está registrado, recibirás un enlace de recuperación pronto.' });
        }

        // 2. Generar Token Único
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        // 3. Guardar en Base de Datos
        await prisma.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });
        
        await prisma.passwordResetToken.create({
            data: {
                email: normalizedEmail,
                token,
                expiresAt
            }
        });

        // 4. Enviar Email vía Nodemailer (Gmail SMTP)
        // Detectar el origen dinámicamente para que el link funcione en el contexto actual (Local o Vercel)
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const origin = `${protocol}://${host}`;
        
        const resetLink = `${origin}/recuperar-password?token=${token}`;
        
        console.log(`🔗 [Password Reset] Generando link: ${resetLink}`);

        try {
            await transporter.sendMail({
                from: `"VirtuAbogado" <${GMAIL_USER}>`,
                to: normalizedEmail,
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
                                <h2 class="title">Recuperación de Cuenta</h2>
                                <p class="text">Hola ${user.nombre}, hemos recibido una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para continuar:</p>
                                <a href="${resetLink}" class="button">Restablecer Contraseña</a>
                                <p style="margin-top: 32px; color: #94a3b8; font-size: 13px;">Este enlace es válido por 15 minutos.</p>
                            </div>
                            <div class="footer">
                                <p class="footer-text">© ${new Date().getFullYear()} VirtuAbogado.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            });

            console.log('✅ [Nodemailer] Correo enviado exitosamente a:', normalizedEmail);
            return NextResponse.json({ message: 'Correo enviado correctamente' });

        } catch (mailError: any) {
            console.error('❌ [Nodemailer Error] Fallo al enviar email:', mailError);
            return NextResponse.json({ 
                error: 'Error de entrega de correo', 
                detail: mailError.message 
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('❌ [Critical Reset] Error:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}
