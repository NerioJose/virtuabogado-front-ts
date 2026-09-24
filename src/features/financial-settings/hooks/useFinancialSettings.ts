'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialSettingsService } from '../services/financial-settings.service';
import { UpdateFinancialSettingsRequest } from '../types/financial-settings.types';

export const FINANCIAL_SETTINGS_KEYS = {
    all: ['FinancialSettings'] as const,
    detail: () => [...FINANCIAL_SETTINGS_KEYS.all, 'detail'] as const,
};

/**
 * Hook para obtener la configuración financiera
 */
export const useFinancialSettings = (options?: any) => {
    return useQuery({
        queryKey: FINANCIAL_SETTINGS_KEYS.detail(),
        queryFn: () => financialSettingsService.get(),
        staleTime: 1000 * 60 * 10, // 10 minutos - los settings cambian muy raramente
        gcTime: 1000 * 60 * 30, // 30 minutos en cache
        ...options
    });
};

/**
 * Hook para actualizar la configuración financiera
 */
export const useUpdateFinancialSettings = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UpdateFinancialSettingsRequest) =>
            financialSettingsService.update(data),
        onMutate: async (newSettings) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: FINANCIAL_SETTINGS_KEYS.detail() });

            // Snapshot previous value
            const previousSettings = queryClient.getQueryData(FINANCIAL_SETTINGS_KEYS.detail());

            // Optimistically update
            queryClient.setQueryData(FINANCIAL_SETTINGS_KEYS.detail(), (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    ...newSettings,
                    updatedAt: new Date(),
                };
            });

            return { previousSettings };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousSettings) {
                queryClient.setQueryData(
                    FINANCIAL_SETTINGS_KEYS.detail(),
                    context.previousSettings
                );
            }
            console.error('❌ Error updating financial settings:', err);
        },
        onSuccess: (data) => {
            // La respuesta del PATCH es la verdad del servidor: aplicarla de inmediato
            queryClient.setQueryData(FINANCIAL_SETTINGS_KEYS.detail(), data);

            // Si se guardó una tasa manual válida, aplicarla a los precios al instante
            const rate = data.usdPenFallbackRate != null ? Number(data.usdPenFallbackRate) : 0;
            if (rate > 0) {
                queryClient.setQueryData(['exchange-rate'], rate);
            }

            // Revalidar para mantener consistencia multi-tab / cross-device
            queryClient.invalidateQueries({
                queryKey: FINANCIAL_SETTINGS_KEYS.detail(),
                refetchType: 'active',
            });
        },
    });
};
