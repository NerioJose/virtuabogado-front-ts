import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        // Si faltan las variables, no crasheamos el middleware, solo dejamos pasar
        return supabaseResponse
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
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

    // DEFINICIÓN DE RUTAS PROTEGIDAS Y ROLES
    const protectedRoutes = [
        { path: '/admin', roles: ['ADMIN'] },
        { path: '/abogado', roles: ['ABOGADO'] },
    ];

    const authRoutes = ['/login', '/register', '/auth/callback'];
    const currentPath = request.nextUrl.pathname;

    const isProtectedRoute = protectedRoutes.some(route => currentPath.startsWith(route.path));
    const isAuthRoute = authRoutes.some(route => currentPath.startsWith(route));

    // ✅ OPTIMIZACIÓN CRÍTICA: Si la ruta es pública y el usuario no está intentando entrar/salir, 
    // no bloqueamos la navegación con getUser(). Esto elimina el delay de navegación.
    if (!isProtectedRoute && !isAuthRoute) {
        return supabaseResponse;
    }

    // SOLO LLAMAR A getUser() SI ES UNA RUTA PROTEGIDA O DE AUTH
    // Esto refresca la sesión si es necesario, pero solo cuando es estrictamente requerido.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 1. REDIRECCIÓN SI NO ESTÁ AUTENTICADO Y ACCEDE A RUTA PROTEGIDA
    if (isProtectedRoute && !user) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // 2. REDIRECCIÓN SI ESTÁ AUTENTICADO PERO ENTRA A LOGIN/REGISTRO
    if (user && (currentPath === '/login' || currentPath === '/register')) {
        const userRole = (user.user_metadata?.rol || 'CLIENTE').toUpperCase();

        const url = request.nextUrl.clone();
        switch (userRole) {
            case 'ADMIN': url.pathname = '/admin'; break;
            case 'ABOGADO': url.pathname = '/abogado'; break;
            default: url.pathname = '/mis-servicios'; break;
        }
        return NextResponse.redirect(url);
    }

    if (user && isProtectedRoute) {
        // En rutas protegidas, inyectamos el ID y ROL en los headers para que la API no tenga que llamar a getUser()
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', user.id);
        requestHeaders.set('x-user-email', user.email || '');
        requestHeaders.set('x-user-role', (user.user_metadata?.rol || 'CLIENTE').toUpperCase());
        
        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });
    }

    return supabaseResponse
}
