/**
 * Rutas centralizadas de la aplicación
 */

export const ROUTES = {
    // Public routes
    HOME: '/',
    SERVICIOS: '/servicios',
    NOSOTROS: '/nosotros',
    CONTACTO: '/contacto',

    // Auth routes
    LOGIN: '/login',
    RECUPERAR_PASSWORD: '/recuperar-password',

    // Dashboard routes
    ADMIN: '/admin',
    ABOGADO: '/abogado',
    CLIENTES: '/clientes',

    // Service routes
    MIS_SERVICIOS: '/mis-servicios',
    COMPRA_EXITOSA: '/compra-exitosa',
    ERROR_PAGO: '/error-pago',
} as const;

export const PUBLIC_ROUTES = [
    ROUTES.HOME,
    ROUTES.SERVICIOS,
    ROUTES.NOSOTROS,
    ROUTES.CONTACTO,
    ROUTES.LOGIN,
    ROUTES.RECUPERAR_PASSWORD,
];

export const PROTECTED_ROUTES = [
    ROUTES.ADMIN,
    ROUTES.ABOGADO,
    ROUTES.CLIENTES,
    ROUTES.MIS_SERVICIOS,
];
