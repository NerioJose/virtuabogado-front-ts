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

        // 4. Enviar Email vía Resend
        const resetLink = `${new URL(request.url).origin}/auth/reset-password?token=${token}`;
        
        await resend.emails.send({
            from: 'VirtuAbogado <onboarding@resend.dev>', // Cambiar a dominio verificado en prod
            to: email,
            subject: 'Restablece tu contraseña - VirtuAbogado 🔒',
            html: `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
                    <div style="background: #1961a0; padding: 30px; text-align: center; color: white;">
                        <h2 style="margin: 0;">VirtuAbogado</h2>
                    </div>
                    <div style="padding: 40px; text-align: center;">
                        <h1 style="color: #1e293b; font-size: 20px;">Restablece tu contraseña</h1>
                        <p style="color: #64748b; line-height: 1.6;">Recibimos una solicitud para cambiar tu contraseña. Haz clic en el botón de abajo para continuar:</p>
                        <a href="${resetLink}" style="display: inline-block; background: #1961a0; color: white; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 20px;">Restablecer mi Contraseña</a>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">Este enlace expirará en 15 minutos. Si no solicitaste este cambio, ignora este correo.</p>
                    </div>
                </div>
            `
        });

        return NextResponse.json({ message: 'Correo enviado correctamente' });

    } catch (error: any) {
        console.error('Error en request-reset:', error);
        return NextResponse.json({ error: 'Error al procesar la solicitud' }, { status: 500 });
    }
}
