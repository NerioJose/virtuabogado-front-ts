'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lawyersService } from '../services/lawyers.service';
import { Lawyer, LawyersFilters } from '../types/lawyers.types';

export const LAWYER_KEYS = {
    all: ['User', 'lawyers'] as const,
    lists: () => [...LAWYER_KEYS.all, 'list'] as const,
    list: (filters: LawyersFilters) => [...LAWYER_KEYS.lists(), filters] as const,
    details: () => [...LAWYER_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...LAWYER_KEYS.details(), id] as const,
};

export const useLawyers = (filters?: LawyersFilters) => {
    return useQuery({
        queryKey: LAWYER_KEYS.list(filters || {}),
        queryFn: () => lawyersService.getAll(filters),
        staleTime: 1000 * 60 * 3, // 3 minutes - lawyer data changes less often
    });
};

export const useLawyer = (id: string) => {
    return useQuery({
        queryKey: LAWYER_KEYS.detail(id),
        queryFn: () => lawyersService.getById(id),
        enabled: !!id && id !== 'new',
        staleTime: 1000 * 60 * 5, // 5 minutes - individual lawyer details rarely change
    });
};

export const useCreateLawyer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: lawyersService.create,
        onMutate: async (newLawyer) => {
            await queryClient.cancelQueries({ queryKey: LAWYER_KEYS.all });
            const previousLawyers = queryClient.getQueryData(LAWYER_KEYS.list({}));

            queryClient.setQueryData(LAWYER_KEYS.list({}), (old: Lawyer[] = []) => [
                ...old,
                { ...newLawyer, id: 'temp-' + Date.now(), createdAt: new Date(), updatedAt: new Date() } as Lawyer
            ]);

            return { previousLawyers };
        },
        onError: (err, newLawyer, context) => {
            if (context?.previousLawyers) {
                queryClient.setQueryData(LAWYER_KEYS.list({}), context.previousLawyers);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.lists() });
        },
    });
};

export const useUpdateLawyer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Lawyer> }) =>
            lawyersService.update(id, data),
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: LAWYER_KEYS.detail(id) });
            await queryClient.cancelQueries({ queryKey: LAWYER_KEYS.lists() });

            const previousLawyer = queryClient.getQueryData(LAWYER_KEYS.detail(id));
            const previousLists = queryClient.getQueriesData({ queryKey: LAWYER_KEYS.lists() });

            // Optimistic update
            queryClient.setQueryData(LAWYER_KEYS.detail(id), (old: Lawyer | undefined) =>
                old ? { ...old, ...data, updatedAt: new Date() } : old
            );

            queryClient.setQueriesData({ queryKey: LAWYER_KEYS.lists() }, (old: Lawyer[] = []) =>
                old.map(lawyer => lawyer.id === id ? { ...lawyer, ...data, updatedAt: new Date() } : lawyer)
            );

            return { previousLawyer, previousLists, id };
        },
        onError: (err, variables, context) => {
            if (context?.previousLawyer) {
                queryClient.setQueryData(LAWYER_KEYS.detail(context.id), context.previousLawyer);
            }
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.detail(data.id), refetchType: 'active' });
            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.lists(), refetchType: 'active' });
        },
    });
};

export const useDeleteLawyer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: lawyersService.delete,
        onMutate: async (id) => {
            // Cancel any outgoing refetches for the list
            await queryClient.cancelQueries({ queryKey: LAWYER_KEYS.all });

            // Snapshot the previous value
            const previousLawyers = queryClient.getQueryData(LAWYER_KEYS.list({}));

            // Optimistically update to remove the lawyer
            queryClient.setQueryData(LAWYER_KEYS.list({}), (old: Lawyer[] = []) => {
                return old.filter(lawyer => lawyer.id !== id);
            });

            return { previousLawyers };
        },
        onError: (err, id, context) => {
            // Rollback to previous state on error
            if (context?.previousLawyers) {
                queryClient.setQueryData(LAWYER_KEYS.list({}), context.previousLawyers);
            }
            console.error('❌ Error al eliminar abogado:', err);
        },
        onSuccess: () => {
            // Invalidate to ensure sync with server
            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all });
            
        },
    });
};
