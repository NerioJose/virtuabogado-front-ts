'use client';

import { useQuery } from '@tanstack/react-query';

async function fetchExchangeRate(): Promise<number | null> {
    try {
        const res = await fetch('/api/exchange-rate');
        if (!res.ok) return null;
        const data = await res.json().catch(() => ({}));
        return typeof data?.rate === 'number' && data.rate > 0 ? data.rate : null;
    } catch {
        return null;
    }
}

/**
 * Tasa USD -> PEN para mostrar precios en soles. Compartida vía cache de TanStack
 * Query (una sola request para todos los componentes).
 */
export function useExchangeRate() {
    const { data, isLoading } = useQuery({
        queryKey: ['exchange-rate'],
        queryFn: fetchExchangeRate,
        staleTime: 1000 * 60 * 5, // 5 min (reflejar rápido cambios del admin)
        gcTime: 1000 * 60 * 60,
        retry: 1,
    });

    return { rate: data ?? null, isLoading };
}
