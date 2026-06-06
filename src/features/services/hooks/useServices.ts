'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesService } from '../services/services.service';
import { CreateServiceRequest, UpdateServiceRequest, Service } from '../types/services.types';

export const servicesKeys = {
    all: ['Service'] as const,
    active: ['Service', 'active'] as const,
    detail: (id: number) => ['Service', id] as const,
};

import { useServicesStore } from '../store/servicesStore';

import { useEffect } from 'react';

export const useServices = (options?: any) => {
    const setServices = useServicesStore(state => state.setServices);
    const query = useQuery({
        queryKey: servicesKeys.active,
        queryFn: () => servicesService.getActive(),
        staleTime: 0,
        refetchInterval: 10000, // 10s de respaldo por si el broadcast no llega
        refetchOnWindowFocus: true,
        ...options
    });

    // Sincronizar con el store de Zustand cuando cambien los datos
    useEffect(() => {
        if (query.data) {
            setServices(query.data as any);
        }
    }, [query.data, setServices]);

    return query;
};

export const useAdminServices = () => {
    const setServices = useServicesStore(state => state.setServices);
    const query = useQuery({
        queryKey: servicesKeys.all,
        queryFn: () => servicesService.getAll(),
        staleTime: 5000,
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (query.data) {
            setServices(query.data as any);
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
            queryClient.invalidateQueries({ queryKey: servicesKeys.all });
            queryClient.invalidateQueries({ queryKey: servicesKeys.active });
            notifyServiceChange(); // Notifica a otras pestañas
        },
    });
};

// Debounce timer compartido para evitar múltiples refetches al hacer toggles rápidos
let invalidateTimer: ReturnType<typeof setTimeout> | null = null;

export const useUpdateService = () => {
    const queryClient = useQueryClient();
    const updateServiceState = useServicesStore(state => state.updateServiceState);
    
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateServiceRequest) => servicesService.update(id, data),
        onSuccess: (updatedService) => {
            // Actualizar store con la respuesta del servidor (valor exacto)
            if (updatedService) {
                updateServiceState((updatedService as any).id || (updatedService as any).id, updatedService as any);
            }
            // Forzar refetch en ambas claves
            queryClient.refetchQueries({ queryKey: servicesKeys.active, type: 'active' });
            queryClient.invalidateQueries({ queryKey: servicesKeys.all });
            queryClient.invalidateQueries({ queryKey: servicesKeys.active });
            notifyServiceChange();
        },
        onError: (_err) => {
            queryClient.invalidateQueries({ queryKey: servicesKeys.all });
            queryClient.invalidateQueries({ queryKey: servicesKeys.active });
        },
    });
};

export const useDeactivateService = () => {
    const queryClient = useQueryClient();
    const updateServiceState = useServicesStore(state => state.updateServiceState);
    
    return useMutation({
        mutationFn: (id: number) => servicesService.deactivate(id),
        onSuccess: (_, id) => {
            // Actualizar store global
            updateServiceState(id, { activo: false });
            queryClient.invalidateQueries({ queryKey: servicesKeys.all });
            queryClient.invalidateQueries({ queryKey: servicesKeys.active });
            notifyServiceChange(); // Notifica a otras pestañas
        },
    });
};
