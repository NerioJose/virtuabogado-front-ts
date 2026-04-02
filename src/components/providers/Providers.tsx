'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { initializeAuth } from '@/features/auth/store/authStore';
import { useEffect, useState } from 'react';
import UploadManager from '@/features/storage/components/UploadManager';

// Componente "dummy" para usar el hook de suscripción dentro del contexto de QueryClient
const RealtimeSubscription = () => {
    const status = useRealtimeSubscription();

    // Optional: You can display connection status in dev mode
    if (process.env.NODE_ENV === 'development') {
        console.log('📊 Realtime Status:', status);
    }

    return null;
};

export default function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // Sincronizar estado de autenticación con la sesión de Supabase al montar la app
        initializeAuth();
    }, []);

    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Keep data fresh for 30 seconds
                        staleTime: 1000 * 30, // 30 seconds (Balanced for Venezuelan high-latency)

                        // Keep unused data in cache for 5 minutes before garbage collection
                        gcTime: 1000 * 60 * 5, // 5 minutes

                        // Only refetch on mount if data is stale (past staleTime)
                        // Setting to false prevents the flash of empty content
                        refetchOnMount: false,

                        // Refetch when window regains focus (good for detecting updates)
                        refetchOnWindowFocus: true, // Enabled for realtime sync

                        // Retry failed requests (network issues)
                        retry: 1,

                        // Use cached data while refetching in background (eliminates loading flashes)
                        placeholderData: (previousData: any) => previousData,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            <RealtimeSubscription />
            {children}
            <UploadManager />
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
