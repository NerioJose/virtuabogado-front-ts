/**
 * Utilidad centralizada para enviar broadcasts Supabase Realtime desde la API.
 * 
 * Usa la Service Role Key para garantizar que los broadcasts se envíen
 * correctamente desde el entorno serverless, incluso cuando Prisma (DIRECT_URL)
 * no dispara eventos WAL de postgres_changes.
 * 
 * Pattern: subscribe → SUBSCRIBED → send → removeChannel
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
    if (!adminClient) {
        adminClient = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
    }
    return adminClient;
}

/**
 * Envía un broadcast a un canal específico de forma confiable.
 * Espera a que el canal esté suscrito antes de enviar.
 */
export async function sendBroadcast(
    channelName: string,
    event: string,
    payload: Record<string, unknown>
): Promise<boolean> {
    const supabaseAdmin = getAdminClient();
    const channel = supabaseAdmin.channel(channelName);

    return new Promise((resolve) => {
        let isDone = false;

        const timeout = setTimeout(() => {
            if (!isDone) {
                isDone = true;
                supabaseAdmin.removeChannel(channel);
                resolve(false);
            }
        }, 15000);

        channel.subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                isDone = true;
                clearTimeout(timeout);
                await channel.send({
                    type: 'broadcast',
                    event,
                    payload,
                });
                supabaseAdmin.removeChannel(channel);
                resolve(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                isDone = true;
                clearTimeout(timeout);
                supabaseAdmin.removeChannel(channel);
                resolve(false);
            }
        });
    });
}

/**
 * Notifica a todos los participantes de una orden sobre un cambio.
 * Emite tanto al canal global de cada usuario como al canal general de órdenes.
 */
export async function broadcastOrderUpdate(params: {
    orderId: string;
    lawyerId?: string | null;
    userId?: string | null;
    status?: string | null;
    eventType?: 'created' | 'updated' | 'deleted';
    isNewAssignment?: boolean;
}): Promise<void | boolean[]> {
    const { orderId, lawyerId, userId, status, eventType = 'updated', isNewAssignment } = params;
    
    // 🛡️ FIREWALL: No notificar sobre órdenes que aún no han sido pagadas o han sido rechazadas
    // Esto evita el "ruido" y las órdenes fantasma en los Dashboards de Admin/Abogado.
    if (status === 'PAGO_PENDIENTE' || status === 'PAGO_RECHAZADO') {
        
        return;
    }
    const payload = {
        orderId,
        lawyerId,
        userId,
        status,
        eventType,
        isNewAssignment,
        timestamp: new Date().toISOString(),
    };

    const broadcasts: Promise<boolean>[] = [];

    // Canal global de actualizaciones - escuchado por useRealtimeSubscription
    broadcasts.push(sendBroadcast('app-updates', 'order-updated', payload));

    // Canal personal del cliente (si existe)
    if (userId) {
        broadcasts.push(sendBroadcast(`global_${userId}`, 'order-updated', payload));
    }

    // Canal personal del abogado (si existe)
    if (lawyerId) {
        broadcasts.push(sendBroadcast(`global_${lawyerId}`, 'order-updated', payload));
    }

    // Awaitable: callers can await this for guaranteed delivery before process ends
    return Promise.all(broadcasts).catch((err) =>
        console.warn('⚠️ [Broadcast] Error enviando broadcasts (non-critical):', err)
    );
}
/**
 * Notifica a todos los clientes sobre un cambio en el catálogo de servicios.
 */
export async function broadcastServiceUpdate(params: {
    serviceId: number;
    eventType?: 'created' | 'updated' | 'deleted';
}): Promise<void> {
    const { serviceId, eventType = 'updated' } = params;
    
    const payload = {
        serviceId,
        eventType,
        timestamp: new Date().toISOString(),
    };

    // Canal global de actualizaciones - escuchado por el el hook useRealtimeSubscription
    // en la versión unificada 'app-updates'
    const broadcasts: Promise<boolean>[] = [];
    broadcasts.push(sendBroadcast('app-updates', 'service-updated', payload));

    await Promise.all(broadcasts).catch((err) =>
        console.warn('⚠️ [Broadcast] Error enviando broadcast de servicios:', err)
    );
}

export async function broadcastPayoutUpdate(params: {
    payoutId: string;
    lawyerId: string;
    eventType: 'created' | 'finalized';
}): Promise<void> {
    const { payoutId, lawyerId, eventType } = params;
    const payload = { payoutId, lawyerId, eventType, timestamp: new Date().toISOString() };
    const broadcasts: Promise<boolean>[] = [];
    broadcasts.push(sendBroadcast('app-updates', 'payout-updated', payload));
    broadcasts.push(sendBroadcast(`global_${lawyerId}`, 'payout-updated', payload));
    await Promise.allSettled(broadcasts);
}
