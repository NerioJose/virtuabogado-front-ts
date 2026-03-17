import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { CLIENT_KEYS } from '@/features/clients/hooks/useClients';
import { LAWYER_KEYS } from '@/features/lawyers/hooks/useLawyers';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';
import { useAuthStore } from '@/features/auth/store/authStore';
import { FINANCIAL_SETTINGS_KEYS } from '@/features/financial-settings/hooks/useFinancialSettings';

export type RealtimeConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export const useRealtimeSubscription = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('CONNECTING');

    // ═══════════════════════════════════════════════
    // POLLING FALLBACK - garantiza datos frescos
    // incluso cuando RLS bloquea eventos Realtime
    // para el cliente anónimo (Mock Login de dev)
    // ═══════════════════════════════════════════════
    useEffect(() => {
        // Polling más espaciado (1 minuto) para no sobrecargar el navegador
        const pollInterval = setInterval(() => {
            // Solo invalidar si el usuario está activo/pestaña visible y está autenticado
            if (document.visibilityState === 'visible' && user?.id) {
                console.log('🔄 [Polling] Refrescando datos en segundo plano...');
                queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
            }
        }, 30_000); 

        return () => clearInterval(pollInterval);
    }, [queryClient]);

    // ═══════════════════════════════════════════════
    // REALTIME - sincronización instantánea (cuando RLS lo permite)
    // ═══════════════════════════════════════════════
    useEffect(() => {
        // No conectar a Realtime si el usuario no ha iniciado sesión
        // Esto evita 401 Unauthorized cuando se refrescan queries sin token
        if (!user?.id) {
            setConnectionStatus('DISCONNECTED');
            return;
        }

        const supabase = createClient();
        console.log(`🚀 [Realtime] Inicializando para usuario: ${user.email} (ID: ${user.id})`);
        
        // Función para manejar los cambios
        const handleChanges = (payload: any) => {
            console.log('🔄 Cambio en DB detectado:', payload);
            const { table } = payload;

            switch (table) {
                case 'User':
                    console.log('👤 Actualizando usuarios...');
                    queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all });
                    queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all });
                    break;
                case 'Order':
                    console.log('📦 Actualizando órdenes...');
                    queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
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
                    queryClient.invalidateQueries({ queryKey: FINANCIAL_SETTINGS_KEYS.all });
                    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
                    break;
                case 'Message':
                    console.log('💬 Nuevo mensaje detectado');
                    if (payload.new && 'orderId' in payload.new) {
                        queryClient.invalidateQueries({ queryKey: ['messages', payload.new.orderId] });
                    }
                    queryClient.invalidateQueries({ queryKey: ['messages'] });
                    break;
            }
        };

        console.log('🚀 Inicializando suscripción Realtime por tablas...');
        
        // Suscribirse a tablas específicas
        const channel = supabase.channel('db-changes');

        // Lista de tablas a monitorear
        const tables = ['User', 'Order', 'Service', 'FinancialSettings', 'Message'];

        tables.forEach(table => {
            channel.on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table
                },
                handleChanges
            );
        });

        channel.subscribe((status: string) => {
            console.log(`📡 Estado de suscripción Realtime: ${status}`);
            
            switch (status) {
                case 'SUBSCRIBED':
                    setConnectionStatus('CONNECTED');
                    // Al conectar, forzar refresh inmediato de datos
                    queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
                    break;
                case 'CHANNEL_ERROR':
                    setConnectionStatus('ERROR');
                    console.error('❌ Error en canal Realtime. El polling de 30s sirve como fallback.');
                    break;
                case 'TIMED_OUT':
                    setConnectionStatus('ERROR');
                    break;
                case 'CLOSED':
                    setConnectionStatus('DISCONNECTED');
                    break;
                default:
                    setConnectionStatus('CONNECTING');
            }
        });

        return () => {
            console.log(`🛑 [Realtime] Limpiando suscripción para: ${user?.email || 'Anónimo'}`);
            supabase.removeChannel(channel);
        };
    }, [queryClient, user?.id]);

    return connectionStatus;
};
