import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/utils/supabase/admin';

export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token y contraseña son obligatorios' }, { status: 400 });
        }

        // 1. Buscar el Token en la DB
        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { token }
        });

        if (!resetToken) {
            return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 400 });
        }

        // 2. Verificar expiración (15 minutos)
        if (new Date() > resetToken.expiresAt) {
            await prisma.passwordResetToken.delete({ where: { token: token } });
            return NextResponse.json({ error: 'El token ha expirado. Solicita uno nuevo.' }, { status: 400 });
        }

        // 3. Obtener el usuario por email
        const user = await prisma.user.findUnique({
            where: { email: resetToken.email }
        });

        if (!user) {
            return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
        }

        // 4. Actualizar contraseña en el Admin Auth de Supabase (bypass RLS)
        const supabaseAdmin = createAdminClient();
        
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: password }
        );

        if (updateError) {
            console.error('Error actualizando password en Supabase:', updateError);
            throw updateError;
        }

        // 5. Eliminar el token (un solo uso)
        await prisma.passwordResetToken.delete({
            where: { token: token }
        });

        return NextResponse.json({ message: 'Contraseña actualizada con éxito' });

    } catch (error: any) {
        console.error('Error en confirm-reset:', error);
        return NextResponse.json({ error: 'Error técnico al actualizar la contraseña' }, { status: 500 });
    }
}
