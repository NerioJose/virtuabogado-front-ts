'use client';

/**
 * Migrado a Socket.IO (backend NestJS).
 *
 * La suscripción a cambios de catálogo vive ahora en
 * `useRealtimeSubscription` (evento `service-updated`, sala `room:public`).
 * Se conserva este hook para no tocar los call sites existentes.
 */
export const useServicesRealtime = (enabled: boolean = true) => {
    void enabled;
};
