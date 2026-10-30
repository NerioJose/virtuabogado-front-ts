'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authSettingsService } from '../services/auth-settings.service';
import { AuthSettings } from '../types';

export const AUTH_SETTINGS_KEYS = {
    all: ['AuthSettings'] as const,
};

export function useAuthSettings() {
    return useQuery({
        queryKey: AUTH_SETTINGS_KEYS.all,
        queryFn: () => authSettingsService.get(),
        staleTime: 0,
    });
}

export function useUpdateAuthSettings() {
    const queryClient = useQueryClient();

    return useMutation<AuthSettings, Error, boolean>({
        mutationFn: (requireEmailConfirmation) =>
            authSettingsService.update(requireEmailConfirmation),
        onSuccess: (data) => {
            queryClient.setQueryData(AUTH_SETTINGS_KEYS.all, data);
            queryClient.invalidateQueries({ queryKey: AUTH_SETTINGS_KEYS.all });
        },
    });
}
