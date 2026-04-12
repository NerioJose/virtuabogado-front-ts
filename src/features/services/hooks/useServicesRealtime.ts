/**
 * useServicesRealtime
 *
 * Suscripción a cambios en tiempo real de la tabla "Service" mediante
 * Supabase Realtime (postgres_changes). NO requiere autenticación —
 * funciona para todos los usuarios, incluso anónimos, en todos los
 * dispositivos en producción.
 *
 * Cómo funciona:
 *  1. Supabase escucha WAL (Write-Ahead Log) de PostgreSQL.
 *  2. Cualquier INSERT / UPDATE / DELETE en "Service" dispara un evento.
 *  3. Este hook lo recibe e invalida la query de servicios activos.
 *  4. React Query hace el refetch y actualiza el store de Zustand.
 *  5. Los componentes re-renderizan con los datos nuevos.
 *
 * Prerrequisito (ya aplicado en migrations/enable_realtime_on_tables.sql):
 *  ALTER PUBLICATION supabase_realtime ADD TABLE "Service";
 */

'use client';

import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { servicesKeys } from './useServices';

export const useServicesRealtime = (enabled: boolean = true) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!enabled) return;

        const supabase = createClient(); // Cliente público (anon key) — sin auth requerida

        const channel = supabase
            .channel('public:Service') // Canal único por tabla
            .on(
                'postgres_changes',
                {
                    event: '*',        // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'Service',
                },
                (payload) => {
                    console.log('🔄 [Realtime Event Received] Service:', payload.eventType, payload.new);
                    // Invalida la query de servicios activos → refetch automático
                    queryClient.invalidateQueries({ queryKey: servicesKeys.active });
                }
            )
            .subscribe((status, error) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ [Realtime - Services] Suscrito correctamente a la tabla "Service".');
                } else {
                    console.warn(`⚠️ [Realtime - Services] Estado: ${status}`, error || '');
                    if (status === 'CHANNEL_ERROR') {
                        console.warn('⚠️ Error de canal (Realtime): Probablemente falta la política RLS de SELECT para "anon" o la tabla no está en la publicación "supabase_realtime".');
                    }
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, enabled]);
};
