'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesService } from '../services/services.service';
import { CreateServiceRequest, UpdateServiceRequest } from '../types/services.types';
import { normalizeService } from '../mappers/serviceJson';

export const servicesKeys = {
    all: ['Service'] as const,
    active: ['Service', 'active'] as const,
    detail: (id: number) => ['Service', id] as const,
};

import { useServicesStore } from '../store/servicesStore';

import { useEffect } from 'react';

// Limpieza one-shot: elimina los snapshots persistidos viejos (sin precioPen)
// que ya no se usan tras quitar la persistencia del store.
const LEGACY_SERVICES_STORAGE_KEY = 'virtu-services-storage';
let purgedLegacyStorage = false;
function purgeLegacyServicesStorage() {
    if (purgedLegacyStorage || typeof window === 'undefined') return;
    purgedLegacyStorage = true;
    try {
        window.localStorage.removeItem(LEGACY_SERVICES_STORAGE_KEY);
    } catch {
        // fail-open: si el storage está inaccesible no bloqueamos el render
    }
}

export const useServices = (options?: any) => {
    purgeLegacyServicesStorage();
    const setServices = useServicesStore(state => state.setServices);
    const query = useQuery({
        queryKey: servicesKeys.active,
        queryFn: () => servicesService.getActive(),
        staleTime: 0,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
        ...options
    });

    // Sincronizar con el store de Zustand cuando cambien los datos.
    // Aplicamos normalizeService SIEMPRE: ninguna fuente (prefetch SSR, API,
    // realtime, invalidaciones) puede colar una fila sin precioPen numérico.
    useEffect(() => {
        if (query.data) {
            setServices((query.data as any[] || []).map(normalizeService));
        }
    }, [query.data, setServices]);

    return query;
};

export const useAdminServices = () => {
    const setServices = useServicesStore(state => state.setServices);
    const query = useQuery({
        queryKey: servicesKeys.all,
        queryFn: () => servicesService.getAll(),
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (query.data) {
            setServices((query.data as any[] || []).map(normalizeService));
        }
    }, [query.data, setServices]);

    return query;
};

// Emite un mensaje a todas las pestañas abiertas para que refresquen los servicios
function notifyServiceChange() {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const ch = new BroadcastChannel('services-update');
        ch.postMessage('changed');
        ch.close();
    }
}

export const useCreateService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateServiceRequest) => servicesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: servicesKeys.all, refetchType: 'all' });
            notifyServiceChange();
        },
    });
};

export const useUpdateService = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateServiceRequest) => servicesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: servicesKeys.all, refetchType: 'all' });
            notifyServiceChange();
        },
        onError: (_err) => {
            queryClient.invalidateQueries({ queryKey: servicesKeys.all, refetchType: 'all' });
        },
    });
};

export const useDeactivateService = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (id: number) => servicesService.deactivate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: servicesKeys.all, refetchType: 'all' });
            notifyServiceChange();
        },
    });
};
