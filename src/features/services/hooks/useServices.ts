import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesService } from '../services/services.service';
import { CreateServiceRequest, UpdateServiceRequest, Service } from '../types/services.types';

export const servicesKeys = {
    all: ['services'] as const,
    active: ['services', 'active'] as const,
    detail: (id: number) => ['services', id] as const,
};

import { useServicesStore } from '../store/servicesStore';

export const useServices = () => {
    const setServices = useServicesStore(state => state.setServices);
    return useQuery({
        queryKey: servicesKeys.active,
        queryFn: async () => {
            const data = await servicesService.getActive();
            // Solo actualizamos el store si hay datos
            if (data) setServices(data);
            return data;
        },
    });
};

export const useAdminServices = () => {
    const setServices = useServicesStore(state => state.setServices);
    return useQuery({
        queryKey: servicesKeys.all,
        queryFn: async () => {
            const data = await servicesService.getAll();
            if (data) setServices(data);
            return data;
        },
    });
};

export const useCreateService = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: CreateServiceRequest) => servicesService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: servicesKeys.all });
            queryClient.invalidateQueries({ queryKey: servicesKeys.active });
        },
    });
};

export const useUpdateService = () => {
    const queryClient = useQueryClient();
    const updateServiceState = useServicesStore(state => state.updateServiceState);
    
    return useMutation({
        mutationFn: ({ id, ...data }: UpdateServiceRequest) => servicesService.update(id, data),
        onSuccess: (updatedService) => {
            // Actualizar store global inmediatamente
            if (updatedService) {
                updateServiceState(updatedService.id, updatedService);
            }
            queryClient.invalidateQueries({ queryKey: servicesKeys.all });
            queryClient.invalidateQueries({ queryKey: servicesKeys.active });
            queryClient.invalidateQueries({ queryKey: servicesKeys.detail(updatedService.id) });
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
        },
    });
};
