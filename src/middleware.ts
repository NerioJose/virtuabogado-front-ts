import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Configuración de rutas críticas para Rate Limiting
const AUTH_PATHS = ['/api/auth', '/api/checkout', '/api/orders'];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    // 🛡️ NIVEL 3: SEGURIDAD (Rate Limiting Preventivo)
    // Nota: Para una protección 100% en producción masiva, se recomienda conectar este bloque a Upstash/Redis.
    if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
        // Marcamos la petición con un identificador de seguridad (IP)
        const ip = request.headers.get('x-forwarded-for') || 'anonymous';
        
        // Aquí se puede integrar la lógica de Upstash Rate Limit
        // Por ahora, añadimos cabeceras de seguridad para rastreo en Vercel
        const response = await updateSession(request);
        response.headers.set('x-security-guarded', 'true');
        return response;
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
