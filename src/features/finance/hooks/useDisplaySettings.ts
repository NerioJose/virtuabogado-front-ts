'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const displaySettingsKeys = {
    all: ['display-settings'] as const,
};

type DisplaySettings = {
    showUsd: boolean;
};

async function fetchDisplaySettings(): Promise<DisplaySettings> {
    try {
        const res = await fetch('/api/display-settings');
        if (!res.ok) return { showUsd: true };
        const data = await res.json().catch(() => ({}));
        return { showUsd: typeof data?.showUsd === 'boolean' ? data.showUsd : true };
    } catch {
        return { showUsd: true };
    }
}

/**
 * Flag global "¿mostrar montos en US$?". Se actualiza al instante vía
 * Supabase Realtime (WAL): sin refetchInterval ni polling — el refetch se
 * dispara cuando la suscripción a "DisplaySettings" invalida la query
 * (staleTime: 0 => refetch inmediato).
 */
export function useDisplaySettings() {
    const { data } = useQuery<DisplaySettings>({
        queryKey: displaySettingsKeys.all,
        queryFn: fetchDisplaySettings,
        staleTime: 0,
        gcTime: 1000 * 60 * 60,
        retry: 1,
    });

    // Default `false` mientras carga: nunca mostrar US$ si el flag aún no se
    // confirmó. Evita el flash "US$ aparece y luego se oculta" cuando el admin
    // tiene showUsd desactivado. El valor real llega del fetch/realtime.
    return { showUsd: data?.showUsd ?? false, isLoading: data === undefined };
}

export function useUpdateDisplaySettings() {
    const queryClient = useQueryClient();

    return useMutation<DisplaySettings, Error, boolean, { previous?: DisplaySettings }>({
        mutationFn: async (showUsd) => {
            const res = await fetch('/api/display-settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ showUsd }),
            });
            if (!res.ok) throw new Error('No se pudo actualizar la configuración');
            return res.json();
        },
        onMutate: async (showUsd) => {
            await queryClient.cancelQueries({ queryKey: displaySettingsKeys.all });
            const previous = queryClient.getQueryData<DisplaySettings>(displaySettingsKeys.all);
            queryClient.setQueryData<DisplaySettings>(displaySettingsKeys.all, { showUsd });
            return { previous };
        },
        onError: (_err, _showUsd, context) => {
            // Rollback: si el PATCH falló, restauramos el valor previo para que
            // el switch no quede pegado a un estado que nunca persistió.
            if (context?.previous) {
                queryClient.setQueryData<DisplaySettings>(displaySettingsKeys.all, context.previous);
            }
        },
        onSettled: () => {
            // Converger SIEMPRE al valor persistido en el servidor (éxito o error).
            queryClient.invalidateQueries({ queryKey: displaySettingsKeys.all });
        },
    });
}