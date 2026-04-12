'use client';

import React, { useEffect, useState } from 'react';
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
                
                // Force refetch all active order and service queries
                queryClient.refetchQueries({ 
                    queryKey: ORDER_KEYS.all,
                    type: 'active' 
                });
                queryClient.refetchQueries({
                    queryKey: ['Service'],
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
        if (!user?.id || connectionStatus === 'DISCONNECTED') return;

        const supabase = createClient();
        

        const handleUpdate = (payload: any) => {
            // Este handler ahora solo se encarga de actualizaciones de servicios
            // ya que las órdenes las maneja el GlobalChatListener
            const eventName = payload?.event || (payload?.payload as any)?.event;
            const eventPayload = payload?.payload || payload;
            
            if (eventName === 'service-updated') {
                
                if (eventPayload?.serviceId) {
                    const { useServicesStore } = require('@/features/services/store/servicesStore');
                    useServicesStore.getState().updateServiceState(eventPayload.serviceId, eventPayload);
                }
                queryClient.invalidateQueries({ queryKey: ['Service'], refetchType: 'all' });
            }
        };

        // Canal global - todos los administradores y usuarios lo reciben
        const globalChannel = supabase.channel('app-updates');
        globalChannel
            .on('broadcast', { event: 'order-updated' }, handleUpdate)
            .on('broadcast', { event: 'service-updated' }, handleUpdate)
            .subscribe((status) => {
                
            });

        // Canal personal - notificaciones dirigidas (abogado asignado, cliente propietario)
        const personalChannel = supabase.channel(`global_${user.id}`);
        personalChannel
            .on('broadcast', { event: 'order-updated' }, handleUpdate)
            .subscribe((status) => {
                
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
        // Blindaje estricto: no iniciar si no hay usuario o si estamos cargando auth
        if (!user?.id) {
            if (connectionStatus !== 'DISCONNECTED') {
                setConnectionStatus('DISCONNECTED');
            }
            return;
        }

        const supabase = createClient();
        

        // Función para manejar los cambios
        const handleChanges = (payload: any) => {
            
            const { table } = payload;

            switch (table) {
                case 'User':
                    
                    queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all, refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all, refetchType: 'all' });
                    break;
                case 'Order':
                    
                    // Force immediate refetch of ALL active order queries (including filtered by lawyer)
                    queryClient.refetchQueries({ 
                        queryKey: ORDER_KEYS.all,
                        type: 'active'
                    });
                    // Also invalidate inactive ones so they'll be fresh on next use
                    queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
                    // CASCADE INVALIDATION: Orders affect finances and stats
                    queryClient.invalidateQueries({ queryKey: ['DashboardStats'] });
                    queryClient.invalidateQueries({ queryKey: ['Finance'] });
                    queryClient.invalidateQueries({ queryKey: ['FinancialSummary'] });
                    
                    if (payload.new && 'id' in payload.new) {
                        queryClient.refetchQueries({ 
                            queryKey: ORDER_KEYS.detail(payload.new.id),
                            type: 'active'
                        });
                    }
                    break;
                case 'Service':
                    
                    queryClient.invalidateQueries({ queryKey: ['Service'], refetchType: 'all' });
                    break;
                case 'FinancialSettings':
                    
                    queryClient.invalidateQueries({ queryKey: FINANCIAL_SETTINGS_KEYS.all, refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['DashboardStats'], refetchType: 'all' });
                    break;
                case 'PaymentMethod':
                    
                    queryClient.invalidateQueries({ queryKey: ['PaymentMethod'], refetchType: 'all' });
                    break;
                case 'Message':
                    
                    if (payload.new && 'orderId' in payload.new) {
                        queryClient.refetchQueries({
                            queryKey: ['Message', payload.new.orderId],
                            type: 'active'
                        });
                    }
                    queryClient.invalidateQueries({ queryKey: ['Message'] });
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

            

            const channelName = `db-changes-${user?.id}-${Date.now()}`;
            const channel = supabase.channel(channelName);
            channelRef = channel;

            let tables = ['Order', 'Message', 'Service', 'PaymentMethod'];
            if (user?.rol === 'ADMIN') {
                tables = ['User', 'Order', 'Service', 'FinancialSettings', 'Message', 'PaymentMethod'];
            } else if (user?.rol === 'ABOGADO') {
                tables = ['User', 'Order', 'Service', 'Message', 'PaymentMethod'];
            }

            tables.forEach(table => {
                channel.on('postgres_changes', { event: '*', schema: 'public', table }, handleChanges);
            });

            channel.subscribe((status: string, err?: any) => {
                switch (status) {
                    case 'SUBSCRIBED':
                        setConnectionStatus('CONNECTED');
                        
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
            
            if (channelRef) supabase.removeChannel(channelRef);
        };
    }, [queryClient, user?.id]);

    return connectionStatus;
};
