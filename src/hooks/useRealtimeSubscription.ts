import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { CLIENT_KEYS } from '@/features/clients/hooks/useClients';
import { LAWYER_KEYS } from '@/features/lawyers/hooks/useLawyers';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';

export type RealtimeConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export const useRealtimeSubscription = () => {
    const queryClient = useQueryClient();
    const supabase = createClient();
    const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('CONNECTING');

    useEffect(() => {
        console.log('🚀 Inicializando suscripción Realtime...');

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
                            // Also invalidate specific order if we have the ID
                            if (payload.new && 'id' in payload.new) {
                                queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(payload.new.id) });
                            }
                            break;

                        case 'Service':
                            console.log('🛠️ Actualizando servicios...');
                            queryClient.invalidateQueries({ queryKey: ['services'] });
                            break;

                        case 'FinancialSettings':
                            console.log('💰 Actualizando configuración financiera...');
                            queryClient.invalidateQueries({ queryKey: ['financial-settings'] });
                            // Also invalidate dashboard since it depends on financial settings
                            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                            break;

                        case 'Message':
                            console.log('💬 Nuevo mensaje detectado');
                            if (payload.new && 'orderId' in payload.new) {
                                // Invalidate specific order chat
                                queryClient.invalidateQueries({
                                    queryKey: ['messages', payload.new.orderId]
                                });
                                console.log(`📨 Invalidando chat de orden: ${payload.new.orderId}`);
                            }
                            // Also invalidate general message queries
                            queryClient.invalidateQueries({ queryKey: ['messages'] });
                            break;

                        default:
                            console.log(`ℹ️ Cambio detectado en tabla no manejada: ${table}`);
                    }
                }
            )
            .subscribe((status) => {
                console.log(`📡 Estado de suscripción Realtime: ${status}`);

                // Update connection status
                switch (status) {
                    case 'SUBSCRIBED':
                        setConnectionStatus('CONNECTED');
                        console.log('✅ Realtime conectado exitosamente');
                        break;
                    case 'CHANNEL_ERROR':
                        setConnectionStatus('ERROR');
                        console.error('❌ Error en canal Realtime');
                        break;
                    case 'TIMED_OUT':
                        setConnectionStatus('ERROR');
                        console.error('⏱️ Timeout en conexión Realtime');
                        break;
                    case 'CLOSED':
                        setConnectionStatus('DISCONNECTED');
                        console.warn('🔌 Canal Realtime cerrado');
                        break;
                    default:
                        setConnectionStatus('CONNECTING');
                }
            });

        return () => {
            console.log('🛑 Limpiando suscripción Realtime...');
            supabase.removeChannel(channel);
        };
    }, [queryClient, supabase]);

    return connectionStatus;
};
