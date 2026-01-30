import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { CLIENT_KEYS } from '@/features/clients/hooks/useClients';
import { LAWYER_KEYS } from '@/features/lawyers/hooks/useLawyers';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';

export const useRealtimeSubscription = () => {
    const queryClient = useQueryClient();
    const supabase = createClient();

    useEffect(() => {
        // Subscribe to changes in public schema
        const channel = supabase
            .channel('db-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                },
                (payload) => {
                    console.log('🔄 Cambio en DB detectado:', payload);
                    const { table, eventType } = payload;

                    // Invalidate queries based on table name
                    switch (table) {
                        case 'User':
                            // Users table contains both clients and lawyers
                            // We invalidate both to be safe and simple, or we could check payload.new.rol
                            console.log('👤 Actualizando usuarios (Clientes/Abogados)...');
                            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all });
                            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all });
                            break;

                        case 'Order':
                            console.log('📦 Actualizando órdenes...');
                            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
                            break;

                        case 'Message':
                            // Messages are often order-specific, we might want to invalidate specific order chat
                            // But for now, let's look for orderId if available to be specific?
                            // Or just general invalidation if we have global message lists (unlikely)
                            // Usually chat handles its own subscription, but this is a safety net.
                            if (payload.new && 'orderId' in payload.new) {
                                // Logic to invalidate specific chat query if we had one in React Query
                                // Currently chat might be handled differently, but good to have.
                            }
                            break;
                    }
                }
            )
            .subscribe((status) => {
                console.log(`📡 Estado de suscripción Realtime: ${status}`);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, supabase]);
};
