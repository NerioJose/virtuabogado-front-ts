'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

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
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Keep data fresh for 2 minutes - data won't refetch during this time
                        staleTime: 1000 * 60 * 2, // 2 minutes

                        // Keep unused data in cache for 5 minutes before garbage collection
                        gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)

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
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
