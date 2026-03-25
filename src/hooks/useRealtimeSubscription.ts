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
    // ═══════════════════════════════════════════════
    useEffect(() => {
        const pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible' && user?.id) {
                console.log('🔄 [Polling] Refrescando datos en segundo plano...');
                // Force refetch all active order and service queries
                queryClient.refetchQueries({ 
                    queryKey: ORDER_KEYS.all,
                    type: 'active' 
                });
                queryClient.refetchQueries({
                    queryKey: ['services'],
                    type: 'active'
                });
            }
        }, 30_000); // Reducido a 30s para mayor respuesta

        return () => clearInterval(pollInterval);
    }, [queryClient, user?.id]);

    // ═══════════════════════════════════════════════
    // BROADCAST LISTENER - sincronización instantánea entre usuarios
    // Las mutaciones via Prisma (PATCH/POST API) no disparan WAL events.
    // La API envía broadcasts manuales (global + personal) tras cada mutación.
    // Este listener escucha ambos canales y fuerza refetch inmediato en TODOS
    // los usuarios conectados (abogado, cliente, admin).
    // ═══════════════════════════════════════════════
    useEffect(() => {
        if (!user?.id) return;

        const supabase = createClient();

        const handleUpdate = (payload: any) => {
            // Unificar extracción del evento y el contenido
            // A veces viene en payload.event, otras directamente.
            const eventName = payload?.event || (payload?.payload as any)?.event;
            const eventPayload = payload?.payload || payload;
            
            console.log(`📡 [Broadcast] ${eventName} recibido:`, eventPayload);
            
            // Re-fetch y actualización de Stores para reactividad máxima
            if (eventName === 'order-updated') {
                // Sincronizar con el store de órdenes si hay ID
                if (eventPayload?.orderId) {
                    const { useOrdersStore } = require('@/features/orders/store/ordersStore');
                    useOrdersStore.getState().updateOrder(eventPayload.orderId, {
                        status: eventPayload.status,
                        lawyerId: eventPayload.lawyerId,
                    });
                }
                
                // Invalida TODO lo relacionado a órdenes para un refresh total
                queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all, refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
            } else if (eventName === 'service-updated') {
                if (eventPayload?.serviceId) {
                    const { useServicesStore } = require('@/features/services/store/servicesStore');
                    useServicesStore.getState().updateServiceState(eventPayload.serviceId, eventPayload);
                }
                queryClient.invalidateQueries({ queryKey: ['services'], refetchType: 'all' });
            }
        };

        // Canal global - todos los administradores y usuarios lo reciben
        const globalChannel = supabase.channel('app-updates');
        globalChannel
            .on('broadcast', { event: 'order-updated' }, handleUpdate)
            .on('broadcast', { event: 'service-updated' }, handleUpdate)
            .subscribe((status) => {
                console.log('📡 [Broadcast Global] Estado:', status);
            });

        // Canal personal - notificaciones dirigidas (abogado asignado, cliente propietario)
        const personalChannel = supabase.channel(`global_${user.id}`);
        personalChannel
            .on('broadcast', { event: 'order-updated' }, handleUpdate)
            .subscribe((status) => {
                console.log(`📡 [Broadcast Personal global_${user.id}] Estado:`, status);
            });

        return () => {
            supabase.removeChannel(globalChannel);
            supabase.removeChannel(personalChannel);
        };
    }, [queryClient, user?.id]);

    // ═══════════════════════════════════════════════
    // REALTIME - sincronización instantánea
    // ═══════════════════════════════════════════════
    useEffect(() => {
        if (!user?.id) {
            setConnectionStatus('DISCONNECTED');
            return;
        }

        const supabase = createClient();
        console.log(`🚀 [Realtime] Inicializando para usuario: ${user.email} (ID: ${user.id})`);

        // Función para manejar los cambios
        const handleChanges = (payload: any) => {
            console.log('🔄 Cambio en DB detectado:', payload.table, payload.eventType);
            const { table } = payload;

            switch (table) {
                case 'User':
                    console.log('👤 Actualizando usuarios...');
                    queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all, refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all, refetchType: 'all' });
                    break;
                case 'Order':
                    console.log('📦 Actualizando órdenes... [Realtime force-refetch]');
                    // Force immediate refetch of ALL active order queries (including filtered by lawyer)
                    queryClient.refetchQueries({ 
                        queryKey: ORDER_KEYS.all,
                        type: 'active'
                    });
                    // Also invalidate inactive ones so they'll be fresh on next use
                    queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
                    if (payload.new && 'id' in payload.new) {
                        queryClient.refetchQueries({ 
                            queryKey: ORDER_KEYS.detail(payload.new.id),
                            type: 'active'
                        });
                    }
                    break;
                case 'Service':
                    console.log('🛠️ Actualizando servicios...');
                    queryClient.invalidateQueries({ queryKey: ['services'], refetchType: 'all' });
                    break;
                case 'FinancialSettings':
                    console.log('💰 Actualizando configuración financiera...');
                    queryClient.invalidateQueries({ queryKey: FINANCIAL_SETTINGS_KEYS.all, refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'], refetchType: 'all' });
                    break;
                case 'Message':
                    console.log('💬 Nuevo mensaje detectado');
                    if (payload.new && 'orderId' in payload.new) {
                        queryClient.refetchQueries({ 
                            queryKey: ['messages', payload.new.orderId],
                            type: 'active'
                        });
                    }
                    queryClient.invalidateQueries({ queryKey: ['messages'] });
                    break;
            }
        };

        // ─── Verificar sesión antes de suscribirse (IIFE async) ──────────────
        // Si la sesión ya expiró, saltamos la suscripción postgres_changes
        // para evitar que el CHANNEL_ERROR dispare un intento de re-autenticación.
        // El broadcast (order-updates + global_{id}) ya cubre la reactividad principal.
        let channelRef: ReturnType<typeof supabase.channel> | null = null;

        (async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            if (!sessionData.session) {
                console.warn('⚠️ [Realtime] Sesión expirada, saltando suscripción postgres_changes. El broadcast sigue activo.');
                setConnectionStatus('DISCONNECTED');
                return;
            }

            console.log('🚀 Inicializando suscripción Realtime por tablas...');

            const channelName = `db-changes-${user?.id}-${Date.now()}`;
            const channel = supabase.channel(channelName);
            channelRef = channel;

            let tables = ['Order', 'Message', 'Service'];
            if (user?.rol === 'ADMIN') {
                tables = ['User', 'Order', 'Service', 'FinancialSettings', 'Message'];
            } else if (user?.rol === 'ABOGADO') {
                tables = ['User', 'Order', 'Service', 'Message'];
            }

            tables.forEach(table => {
                channel.on('postgres_changes', { event: '*', schema: 'public', table }, handleChanges);
            });

            channel.subscribe((status: string, err?: any) => {
                switch (status) {
                    case 'SUBSCRIBED':
                        setConnectionStatus('CONNECTED');
                        console.log(`✅ [Realtime] Suscripción activa [${channelName}]`);
                        queryClient.refetchQueries({ queryKey: ORDER_KEYS.all, type: 'active' });
                        break;
                    case 'CHANNEL_ERROR':
                        // Silenciar: el CHANNEL_ERROR ocurre cuando RLS bloquea la suscripción WAL.
                        // El broadcast (order-updates + global_{id}) ya cubre la reactividad.
                        setConnectionStatus('ERROR');
                        if (err && Object.keys(err).length > 0) {
                            console.warn(`⚠️ [Realtime] Canal con error RLS. Broadcast activo como fallback.`, JSON.stringify(err));
                        } else {
                            console.info(`ℹ️ [Realtime] postgres_changes bloqueado por RLS (esperado). Broadcast activo.`);
                        }
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
        })();

        return () => {
            console.log(`🛑 [Realtime] Limpiando suscripción para: ${user?.email || 'Anónimo'}`);
            if (channelRef) supabase.removeChannel(channelRef);
        };
    }, [queryClient, user?.id]);

    return connectionStatus;
};
