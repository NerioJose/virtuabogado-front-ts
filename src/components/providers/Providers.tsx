'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';

// Componente "dummy" para usar el hook de suscripción dentro del contexto de QueryClient
const RealtimeSubscription = () => {
    useRealtimeSubscription();
    return null;
};

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // staleTime: 60 * 1000, -- Removed staleTime to force fresh fetches during debug
                        staleTime: 0,
                        refetchOnWindowFocus: true, // Ensure window focus triggers refetch
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
