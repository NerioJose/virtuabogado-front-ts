'use client';

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { CLIENT_KEYS } from '@/features/clients/hooks/useClients';
import { LAWYER_KEYS } from '@/features/lawyers/hooks/useLawyers';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';
import { useAuthStore } from '@/features/auth/store/authStore';
import { FINANCIAL_SETTINGS_KEYS } from '@/features/financial-settings/hooks/useFinancialSettings';
import { useChatStore } from '@/features/chat/store/chatStore';
import { connectSocket } from '@/lib/socket';
interface ExchangeRateUpdatedPayload {
    rate?: number;
}

interface DisplaySettingsUpdatedPayload {
    showUsd?: boolean;
}

interface BroadcastPayload {
    event?: string;
    rate?: number;
    showUsd?: boolean;
}

interface BroadcastEnvelope {
    event?: string;
    payload?: BroadcastPayload;
}

interface NewMessageEnvelope {
    payload?: {
        new?: {
            id?: string;
            orderId?: string;
            senderId?: string;
        };
    };
}

interface PostgresChangePayload {
    table?: string;
    new?: {
        id?: string;
        orderId?: string;
        senderId?: string;
    };
}

export type RealtimeConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export const useRealtimeSubscription = () => {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>('CONNECTING');
    const connectionStatusRef = useRef(connectionStatus);

    useEffect(() => {
        connectionStatusRef.current = connectionStatus;
    }, [connectionStatus]);

    // ═══════════════════════════════════════════════
    // F1 — Catálogo y settings vía Socket.IO (backend NestJS)
    // El backend es el único emisor; el front ya no usa Supabase Realtime
    // para servicios, display-settings ni exchange-rate.
    // ═══════════════════════════════════════════════
    useEffect(() => {
        const socket = connectSocket();

        const onServiceUpdated = () => {
            queryClient.invalidateQueries({ queryKey: ['Service'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['Service', 'active'], refetchType: 'all' });
        };

        const onExchangeRateUpdated = (payload: ExchangeRateUpdatedPayload) => {
            const rate = Number(payload?.rate);
            if (Number.isFinite(rate) && rate > 0) {
                queryClient.setQueryData(['exchange-rate'], rate);
            } else {
                queryClient.invalidateQueries({ queryKey: ['exchange-rate'], refetchType: 'all' });
            }
            queryClient.invalidateQueries({ queryKey: FINANCIAL_SETTINGS_KEYS.all, refetchType: 'all' });
        };

        const onDisplaySettingsUpdated = (payload: DisplaySettingsUpdatedPayload) => {
            if (typeof payload?.showUsd === 'boolean') {
                queryClient.setQueryData(['display-settings'], { showUsd: payload.showUsd });
            } else {
                queryClient.invalidateQueries({ queryKey: ['display-settings'], refetchType: 'all' });
            }
        };

        socket.on('service-updated', onServiceUpdated);
        socket.on('exchange-rate-updated', onExchangeRateUpdated);
        socket.on('display-settings-updated', onDisplaySettingsUpdated);

        return () => {
            socket.off('service-updated', onServiceUpdated);
            socket.off('exchange-rate-updated', onExchangeRateUpdated);
            socket.off('display-settings-updated', onDisplaySettingsUpdated);
        };
    }, [queryClient, user?.id, user?.rol]);

    // ═══════════════════════════════════════════════
    // BROADCAST LISTENER - sincronización instantánea entre usuarios
    // Las mutaciones via Prisma (PATCH/POST API) no disparan WAL events.
    // La API envía broadcasts manuales (global + personal) tras cada mutación.
    // Este listener escucha ambos canales y fuerza refetch inmediato en TODOS
    // los usuarios conectados (abogado, cliente, admin) incluidos anónimos.
    // ═══════════════════════════════════════════════
    useEffect(() => {
        const supabase = createClient();

        const handleUpdate = (payload: BroadcastEnvelope) => {
            const eventName = payload.event ?? payload.payload?.event;
            const eventPayload = payload.payload ?? {};
            
            if (eventName === 'order-updated') {
                queryClient.invalidateQueries({ queryKey: ['Order'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['PayoutHistory'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['PendingPayouts'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['FinanceSummaryDashboard'], refetchType: 'all' });
            }
            
            if (eventName === 'service-updated') {
                queryClient.invalidateQueries({ queryKey: ['Service'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['Service', 'active'], refetchType: 'all' });
            }
            
            if (eventName === 'exchange-rate-updated') {
                const exchangeRate = Number(eventPayload?.rate);
                if (Number.isFinite(exchangeRate) && exchangeRate > 0) {
                    // Aplica la nueva tasa al instante en TODOS los clientes (incluidos anónimos).
                    // DualPrice/Money dependen de la query ['exchange-rate'] y se re-renderizan solos.
                    queryClient.setQueryData(['exchange-rate'], exchangeRate);
                } else {
                    // Sin tasa manual → volver a consultar la automática
                    queryClient.invalidateQueries({ queryKey: ['exchange-rate'], refetchType: 'all' });
                }
                queryClient.invalidateQueries({ queryKey: FINANCIAL_SETTINGS_KEYS.all, refetchType: 'all' });
            }

            if (eventName === 'display-settings-updated') {
                const showUsd = eventPayload?.showUsd;
                if (typeof showUsd === 'boolean') {
                    queryClient.setQueryData(['display-settings'], { showUsd });
                } else {
                    queryClient.invalidateQueries({ queryKey: ['display-settings'], refetchType: 'all' });
                }
            }
            
            if (eventName === 'payout-updated') {
                queryClient.invalidateQueries({ queryKey: ['PayoutHistory'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['PendingPayouts'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['Finance'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['FinancialSummary'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ['FinanceSummaryDashboard'], refetchType: 'all' });
                queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all, refetchType: 'all' });
            }
        };

        const handleNewMessage = (payload: NewMessageEnvelope) => {
            const data = payload.payload?.new;
            if (data?.orderId && data.id) {
                queryClient.invalidateQueries({ queryKey: ['chat', 'messages', data.orderId] });
                if (data.senderId !== user?.id) {
                    useChatStore.getState().markAsUnread(data.orderId, data.id);
                }
            }
        };

        // Canal personal - solo para usuarios autenticados
        const personalChannel = user?.id ? supabase.channel(`global_${user.id}`) : null;
        if (personalChannel) {
            personalChannel
                .on('broadcast', { event: 'order-updated' }, handleUpdate)
                .on('broadcast', { event: 'payout-updated' }, handleUpdate)
                .on('broadcast', { event: 'new_message' }, handleNewMessage)
                .subscribe();
        }

        // Canal de administradores - reciben actualizaciones de órdenes/payouts
        // sin re-transmitir a la base global de usuarios conectados
        const adminChannel = user?.rol === 'ADMIN' ? supabase.channel('admin-updates') : null;
        if (adminChannel) {
            adminChannel
                .on('broadcast', { event: 'order-updated' }, handleUpdate)
                .on('broadcast', { event: 'payout-updated' }, handleUpdate)
                .subscribe();
        }

        return () => { // react-doctor: cleanup-verified
            if (personalChannel) supabase.removeChannel(personalChannel);
            if (adminChannel) supabase.removeChannel(adminChannel);
        };
    }, [queryClient, user?.id, user?.rol]);

    // ═══════════════════════════════════════════════
    // REALTIME - sincronización instantánea
    // ═══════════════════════════════════════════════
    useEffect(() => {
        let mounted = true;

        // Blindaje estricto: no iniciar si no hay usuario o si estamos cargando auth
        if (!user?.id) {
            if (connectionStatusRef.current !== 'DISCONNECTED') {
                setConnectionStatus('DISCONNECTED');
            }
            return;
        }

        const supabase = createClient();
        

        // Función para manejar los cambios
        const handleChanges = (payload: PostgresChangePayload) => {
            const table = payload.table;

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
                    queryClient.invalidateQueries({ queryKey: ['FinanceSummaryDashboard'] });
                    
                    const orderId = payload.new?.id;
                    if (typeof orderId === 'string') {
                        queryClient.refetchQueries({
                            queryKey: ORDER_KEYS.detail(orderId),
                            type: 'active',
                        });
                    }
                    break;
                case 'Service':
                    
                    queryClient.invalidateQueries({ queryKey: ['Service'], refetchType: 'all' });
                    break;
                case 'FinancialSettings':
                    
                    queryClient.invalidateQueries({ queryKey: FINANCIAL_SETTINGS_KEYS.all, refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['DashboardStats'], refetchType: 'all' });
                    // La tasa solo la ve el ADMIN (RLS lo restringe): al cambiar la
                    // config financiera se fuerza el refetch de la tasa compartida.
                    queryClient.invalidateQueries({ queryKey: ['exchange-rate'], refetchType: 'all' });
                    break;
                case 'PaymentMethod':
                    
                    queryClient.invalidateQueries({ queryKey: ['PaymentMethod'], refetchType: 'all' });
                    break;
                case 'Message': {
                    const orderId = payload.new?.orderId;
                    const messageId = payload.new?.id;
                    if (typeof orderId === 'string') {
                        queryClient.refetchQueries({
                            queryKey: ['Message', orderId],
                            type: 'active',
                        });
                        if (typeof messageId === 'string' && payload.new?.senderId !== user?.id) {
                            useChatStore.getState().markAsUnread(orderId, messageId);
                        }
                    }
                    queryClient.invalidateQueries({ queryKey: ['Message'] });
                    break;
                }
                case 'LawyerPayouts':
                    
                    queryClient.invalidateQueries({ queryKey: ['PayoutHistory'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['PendingPayouts'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['Finance'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['FinancialSummary'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ['FinanceSummaryDashboard'], refetchType: 'all' });
                    queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all, refetchType: 'all' });
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
                if (!mounted) return;
                setConnectionStatus('DISCONNECTED');
                return;
            }

            

            const channelName = `db-changes-${user?.id}-${Date.now()}`;
            const channel = supabase.channel(channelName);
            channelRef = channel;

            // Suscripciones postgres_changes ACOTADAS por columna (F3):
            // los clientes solo escuchan sus propias órdenes y los abogados las suyas,
            // en vez de recibir el stream WAL completo de la tabla Order.
            // Message/Service/PaymentMethod quedan sin filtro (RLS + catálogo).
            let tableSubscriptions: Array<{ table: string; filter?: string }> = [];
            if (user?.rol === 'ADMIN') {
                tableSubscriptions = ['User', 'Order', 'FinancialSettings', 'Message', 'PaymentMethod', 'LawyerPayouts'].map(t => ({ table: t }));
            } else if (user?.rol === 'ABOGADO') {
                tableSubscriptions = [
                    { table: 'Order', filter: `lawyerId=eq.${user.id}` },
                    { table: 'Message' },
                    { table: 'PaymentMethod' },
                    { table: 'LawyerPayouts', filter: `lawyerId=eq.${user.id}` },
                ];
            } else {
                tableSubscriptions = [
                    { table: 'Order', filter: `userId=eq.${user.id}` },
                    { table: 'Message' },
                    { table: 'PaymentMethod' },
                ];
            }

            tableSubscriptions.forEach(({ table, filter }) => {
                if (filter) {
                    channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, handleChanges);
                } else {
                    channel.on('postgres_changes', { event: '*', schema: 'public', table }, handleChanges);
                }
            });

            channel.subscribe((status: string) => {
                if (!mounted) return;
                switch (status) {
                    case 'SUBSCRIBED':
                        setConnectionStatus('CONNECTED');
                        
                        queryClient.refetchQueries({ queryKey: ORDER_KEYS.all, type: 'active' });
                        break;
                    case 'CHANNEL_ERROR':
                        // Silenciar: el CHANNEL_ERROR ocurre cuando RLS bloquea la suscripción WAL.
                        // El broadcast (order-updates + global_{id}) ya cubre la reactividad.
                        setConnectionStatus('ERROR');
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

        return () => { // react-doctor: cleanup-verified
            mounted = false;
            if (channelRef) supabase.removeChannel(channelRef);
        };
    }, [queryClient, user?.id, user?.rol]);

    return connectionStatus;
};
