import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const getOrigins = () => {
    const envOrigins = process.env.ALLOWED_ORIGINS;
    if (envOrigins) {
        return envOrigins.split(',').map(o => o.trim());
    }
    return [];
};

const ALLOWED_ORIGINS = getOrigins();

const getRateLimitPaths = () => {
    const paths = process.env.RATE_LIMIT_PATHS;
    return paths ? paths.split(',').map(p => p.trim()) : [];
};

const AUTH_PATHS = getRateLimitPaths();

export async function middleware(request: NextRequest) {
    const origin = request.headers.get('origin');
    const { pathname } = request.nextUrl;
    const ip = getClientIp(request);

    const isAllowedOrigin = origin && ALLOWED_ORIGINS.some(allowed => {
        if (allowed.includes('*')) {
            const regex = new RegExp('^' + allowed.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
            return regex.test(origin);
        }
        return allowed === origin;
    });

    // Rate limiting global (Redis/Upstash) para rutas de autenticación
    if (AUTH_PATHS.some(p => pathname.startsWith(p))) {
        const { success } = await checkRateLimit(ip);
        if (!success) {
            return new NextResponse(JSON.stringify({ error: 'Demasiadas solicitudes. Intente de nuevo en un minuto.' }), {
                status: 429,
                headers: { 'Retry-After': '60', 'Content-Type': 'application/json' },
            });
        }
    }

    if (request.method === 'OPTIONS') {
        const response = new NextResponse(null, { status: 204 });
        if (isAllowedOrigin) {
            response.headers.set('Access-Control-Allow-Origin', origin!);
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-user-role, x-user-email');
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Max-Age', '86400');
        }
        return response;
    }

    const publicApiPaths = ['/api/services', '/api/webhooks', '/api/payments'];
    if (publicApiPaths.some(p => pathname.startsWith(p))) {
        const res = NextResponse.next();
        if (isAllowedOrigin) {
            res.headers.set('Access-Control-Allow-Origin', origin!);
            res.headers.set('Access-Control-Allow-Credentials', 'true');
        }
        return res;
    }

    let response: NextResponse;

    if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
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
    matcher: ['/admin/:path*', '/abogado/:path*', '/mis-servicios/:path*', '/api/:path*', '/login', '/register', '/auth/callback'],
}
