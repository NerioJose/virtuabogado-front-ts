import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // ACTUALIZAR SESIÓN DE USUARIO
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // DEFINICIÓN DE RUTAS PROTEGIDAS Y ROLES
    const protectedRoutes = [
        { path: '/admin', roles: ['ADMIN'] },
        { path: '/abogado', roles: ['ABOGADO'] },
    ];

    const currentPath = request.nextUrl.pathname;

    // 1. REDIRECCIÓN SI NO ESTÁ AUTENTICADO Y ACCEDE A RUTA PROTEGIDA
    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route.path));

    // Bypass de desarrollo
    const devBypass = request.cookies.get('virtuabogado-dev-bypass')?.value === 'true';

    if (isProtectedRoute && !user && !devBypass) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // 2. REDIRECCIÓN SI ESTÁ AUTENTICADO PERO ENTRA A LOGIN/REGISTRO
    if (user && (currentPath === '/login' || currentPath === '/register')) {
        // Intentar obtener rol del usuario desde metadatos o base de datos
        // Por ahora, redirigimos a una página por defecto o dashboard según metadata si existe
        // Idealmente, esto debería sincronizarse con tu tabla 'User' via API o metadata
        const userRole = user.user_metadata?.rol || 'CLIENTE';

        const url = request.nextUrl.clone();
        switch (userRole) {
            case 'ADMIN': url.pathname = '/admin'; break;
            case 'ABOGADO': url.pathname = '/abogado'; break;
            default: url.pathname = '/clientes'; break;
        }
        return NextResponse.redirect(url);
    }

    return supabaseResponse
}
