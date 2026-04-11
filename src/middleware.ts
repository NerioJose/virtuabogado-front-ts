import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

// Configuración de dominios permitidos (CORS)
// En producción, hereda de process.env.ALLOWED_ORIGINS
const getOrigins = () => {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
        return envOrigins.split(',').map(o => o.trim());
    }
    return []; // ⛔ Bloqueo total si no hay configuración
};

const ALLOWED_ORIGINS = getOrigins();

// Configuración de rutas críticas para Rate Limiting
const AUTH_PATHS = ['/api/auth', '/api/checkout', '/api/orders'];

export async function middleware(request: NextRequest) {
    const origin = request.headers.get('origin');
    const { pathname } = request.nextUrl;

    // 🛡️ CORs: Validar si el origen es permitido (Soporte para comodines como *.dominio.com)
    const isAllowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => {
        if (allowed.includes('*')) {
            const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return regex.test(origin);
        }
        return allowed === origin;
    });

    // Manejar Preflight (OPTIONS)
    if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 204 });
        if (isAllowedOrigin) {
            response.headers.set('Access-Control-Allow-Origin', origin!);
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-role, x-user-email');
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Max-Age', '86400'); // Cache 24h
        }
        return response;
    }

    // 🛡️ NIVEL 3: SEGURIDAD (Rate Limiting Preventivo)
    let response: NextResponse;
    
    if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
        // Marcamos la petición con un identificador de seguridad (IP)
        const ip = request.headers.get('x-forwarded-for') || 'anonymous';
        
        // Aquí se puede integrar la lógica de Upstash Rate Limit
        // Por ahora, añadimos cabeceras de seguridad para rastreo en Vercel
        response = await updateSession(request);
        response.headers.set('x-security-guarded', 'true');
    } else {
        response = await updateSession(request);
    }

    // Aplicar cabeceras CORS a la respuesta si el origen está permitido
    if (isAllowedOrigin) {
        response.headers.set('Access-Control-Allow-Origin', origin!);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
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
