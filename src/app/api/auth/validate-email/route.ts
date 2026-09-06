import { NextRequest, NextResponse } from 'next/server';
import { validateEmailDeliverability } from '@/lib/emailDeliverability';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/auth/validate-email?email=...
 * Usado por los formularios (registro y checkout) para avisar en vivo
 * cuando el correo es inválido, desechable o el dominio no puede recibir correos.
 */
export async function GET(request: NextRequest) {
    try {
        const email = request.nextUrl.searchParams.get('email') || '';

        const trimmed = email.trim();
        if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
            return NextResponse.json({ ok: false, error: 'Ingresa un correo electrónico válido.' });
        }

        const result = await validateEmailDeliverability(email);
        return NextResponse.json(result);
    } catch (error) {
        console.error('❌ Error en /api/auth/validate-email:', error);
        return NextResponse.json({ ok: true, error: undefined });
    }
}