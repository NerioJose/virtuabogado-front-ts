import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos de 'frescura'
            gcTime: 1000 * 60 * 30,   // Mantener en cache (anteriormente cacheTime) por 30 mins
            refetchOnWindowFocus: false, // 🚀 EVITA CONSULTAS INFINITAS al cambiar de pestaña
            refetchOnReconnect: true,
            retry: 1,
        },
    },
});
