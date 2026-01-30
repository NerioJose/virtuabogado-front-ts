import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsService } from '../services/clients.service';
import { Client, ClientsFilters } from '../types/clients.types';

export const CLIENT_KEYS = {
    all: ['clients'] as const,
    lists: () => [...CLIENT_KEYS.all, 'list'] as const,
    list: (filters: ClientsFilters) => [...CLIENT_KEYS.lists(), filters] as const,
    details: () => [...CLIENT_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...CLIENT_KEYS.details(), id] as const,
};

export const useClients = (filters?: ClientsFilters) => {
    return useQuery({
        queryKey: CLIENT_KEYS.list(filters || {}),
        queryFn: () => clientsService.getAll(filters),
    });
};

export const useClient = (id: string) => {
    return useQuery({
        queryKey: CLIENT_KEYS.detail(id),
        queryFn: () => clientsService.getById(id),
        enabled: !!id,
    });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: clientsService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all });
        },
    });
};

export const useUpdateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
            clientsService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all });
            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.detail(data.id) });
        },
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: clientsService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all });
        },
    });
};
