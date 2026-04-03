import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsService } from '../services/clients.service';
import { Client, ClientsFilters } from '../types/clients.types';

export const CLIENT_KEYS = {
    all: ['User', 'clients'] as const,
    lists: () => [...CLIENT_KEYS.all, 'list'] as const,
    list: (filters: ClientsFilters) => [...CLIENT_KEYS.lists(), filters] as const,
    details: () => [...CLIENT_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...CLIENT_KEYS.details(), id] as const,
};

export const useClients = (filters?: ClientsFilters) => {
    return useQuery({
        queryKey: CLIENT_KEYS.list(filters || {}),
        queryFn: () => clientsService.getAll(filters),
        staleTime: 1000 * 60 * 3, // 3 minutes - client data changes less often
    });
};

export const useClient = (id: string) => {
    return useQuery({
        queryKey: CLIENT_KEYS.detail(id),
        queryFn: () => clientsService.getById(id),
        enabled: !!id && id !== 'new',
        staleTime: 1000 * 60 * 5, // 5 minutes - individual client details rarely change
    });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: clientsService.create,
        onMutate: async (newClient) => {
            await queryClient.cancelQueries({ queryKey: CLIENT_KEYS.all });
            const previousClients = queryClient.getQueryData(CLIENT_KEYS.list({}));

            queryClient.setQueryData(CLIENT_KEYS.list({}), (old: Client[] = []) => [
                ...old,
                { ...newClient, id: 'temp-' + Date.now(), createdAt: new Date(), updatedAt: new Date() } as Client
            ]);

            return { previousClients };
        },
        onError: (err, newClient, context) => {
            if (context?.previousClients) {
                queryClient.setQueryData(CLIENT_KEYS.list({}), context.previousClients);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.lists() });
        },
    });
};

export const useUpdateClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
            clientsService.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: CLIENT_KEYS.detail(id) });
            await queryClient.cancelQueries({ queryKey: CLIENT_KEYS.lists() });

            const previousClient = queryClient.getQueryData(CLIENT_KEYS.detail(id));
            const previousLists = queryClient.getQueriesData({ queryKey: CLIENT_KEYS.lists() });

            // Optimistic update
            queryClient.setQueryData(CLIENT_KEYS.detail(id), (old: Client | undefined) =>
                old ? { ...old, ...data, updatedAt: new Date() } : old
            );

            queryClient.setQueriesData({ queryKey: CLIENT_KEYS.lists() }, (old: Client[] = []) =>
                old.map(client => client.id === id ? { ...client, ...data, updatedAt: new Date() } : client)
            );

            return { previousClient, previousLists, id };
        },
        onError: (err, variables, context) => {
            if (context?.previousClient) {
                queryClient.setQueryData(CLIENT_KEYS.detail(context.id), context.previousClient);
            }
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.detail(data.id), refetchType: 'active' });
            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.lists(), refetchType: 'active' });
        },
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: clientsService.delete,
        onMutate: async (id) => {
            // Cancel any outgoing refetches to avoid overwriting optimistic update
            await queryClient.cancelQueries({ queryKey: CLIENT_KEYS.all });

            // Snapshot the previous value
            const previousClients = queryClient.getQueryData(CLIENT_KEYS.list({}));

            // Optimistically update to remove the client
            queryClient.setQueryData(CLIENT_KEYS.list({}), (old: Client[] = []) => {
                return old.filter(client => client.id !== id);
            });

            return { previousClients };
        },
        onError: (err, id, context) => {
            // Rollback to previous state on error
            if (context?.previousClients) {
                queryClient.setQueryData(CLIENT_KEYS.list({}), context.previousClients);
            }
            console.error('❌ Error al eliminar cliente:', err);
        },
        onSuccess: () => {
            // Invalidate to ensure sync with server
            queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all });
            console.log('✅ Cliente eliminado y caché actualizada');
        },
    });
};
