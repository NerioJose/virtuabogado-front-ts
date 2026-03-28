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

export const useServices = () => {
    const setServices = useServicesStore(state => state.setServices);
    const query = useQuery({
        queryKey: servicesKeys.active,
        queryFn: () => servicesService.getActive(),
        staleTime: 30000, // 30 segundos
        refetchOnWindowFocus: true,
    });

    // Sincronizar con el store de Zustand cuando cambien los datos
    useEffect(() => {
        if (query.data) {
            setServices(query.data);
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
            setServices(query.data);
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
        onMutate: async (variables) => {
            // Optimistic update: actualiza el store INMEDIATAMENTE sin esperar al servidor
            updateServiceState(variables.id, variables);
        },
        onSuccess: (updatedService) => {
            // Sincronizar con la respuesta real del servidor
            if (updatedService) {
                updateServiceState(updatedService.id, updatedService);
            }
            // Debounce: solo invalida queries 500ms después del último toggle
            if (invalidateTimer) clearTimeout(invalidateTimer);
            invalidateTimer = setTimeout(() => {
                queryClient.invalidateQueries({ queryKey: servicesKeys.all });
                queryClient.invalidateQueries({ queryKey: servicesKeys.active });
                notifyServiceChange(); // Notifica a otras pestañas
            }, 500);
        },
        onError: (_err, variables) => {
            // Revertir en caso de error: refrescar todo desde el servidor
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
