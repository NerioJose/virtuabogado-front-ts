'use client';

import { useQuery } from '@tanstack/react-query';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';

/**
 * Hook de Monitoreo de Estatus de Pago (Fintech-Ready)
 * Utiliza TanStack Query v5 con polling dinámico de 3 segundos.
 * Sincronizado con la reactividad global ('Order' key).
 * 
 * @param orderId ID de la orden a monitorear
 * @param enabled Si el monitoreo está activo (ej: esperando webhook)
 */
export const useOrderStatus = (orderId?: string, enabled: boolean = false) => {
    return useQuery({
        queryKey: ORDER_KEYS.status(orderId || ''),
        queryFn: async () => {
            if (!orderId) return null;
            const response = await fetch(`/api/payments/status?orderId=${orderId}`);
            if (!response.ok) throw new Error('Error de red al consultar estatus');
            return response.json() as Promise<{ status: 'PENDING' | 'PAID' | 'ERROR' }>;
        },
        enabled: enabled && !!orderId,
        refetchInterval: (enabled && !!orderId) ? 1000 : false,
        // Reintentos reducidos para evitar saturar el servidor en caso de error
        retry: 3,
        staleTime: 0, // Siempre fresco durante el monitoreo
    });
};
