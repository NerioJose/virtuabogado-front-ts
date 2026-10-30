'use client';

/**
 * Migrado a Socket.IO (backend NestJS).
 *
 * La suscripción a `DisplaySettings` vive ahora en
 * `useRealtimeSubscription` (evento `display-settings-updated`).
 * Se conserva este hook para no tocar los call sites existentes.
 */
export const useDisplaySettingsRealtime = (enabled: boolean = true) => {
    void enabled;
};
