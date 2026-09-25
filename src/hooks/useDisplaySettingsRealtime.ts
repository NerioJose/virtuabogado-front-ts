/**
 * useDisplaySettingsRealtime
 *
 * Suscripción a cambios en tiempo real de la tabla pública "DisplaySettings"
 * mediante Supabase Realtime (postgres_changes). NO requiere autenticación —
 * funciona para todos los usuarios (anónimos, clientes, abogados y admin)
 * porque la tabla tiene política RLS de SELECT pública (USING(true)) y está
 * en la publicación "supabase_realtime".
 *
 * Cómo funciona (idéntico al patrón de "Service"/"PaymentMethod"):
 *  1. Supabase escucha el WAL (Write-Ahead Log) de PostgreSQL.
 *  2. Cualquier INSERT / UPDATE sobre "DisplaySettings" dispara un evento.
 *  3. Este hook invalida la query ['display-settings'] (staleTime 0).
 *  4. React Query refetchea al instante y los precios se ocultan/muestran
 *     sin recargar la página.
 *
 * Cero polling: el refetch se dispara SOLO por el evento WAL del cambio.
 */

'use client';

import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { displaySettingsKeys } from '@/features/finance/hooks/useDisplaySettings';

export const useDisplaySettingsRealtime = (enabled: boolean = true) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!enabled) return;

        const supabase = createClient(); 

        const channel = supabase
            .channel('public:DisplaySettings')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'DisplaySettings',
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: displaySettingsKeys.all });
                }
            )
            .subscribe((status, error) => {
                if (status === 'SUBSCRIBED') {
                    console.log('🟢 [Realtime - DisplaySettings] Conectado');
                } else {
                    console.warn(`⚠️ [Realtime - DisplaySettings] Estado: ${status}`, error || '');
                    if (status === 'CHANNEL_ERROR') {
                        console.warn('⚠️ Error de canal (Realtime): Verificá que "DisplaySettings" tenga política RLS de SELECT para "anon" y esté en la publicación "supabase_realtime".');
                    }
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, enabled]);
};