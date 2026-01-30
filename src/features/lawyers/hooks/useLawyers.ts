import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lawyersService } from '../services/lawyers.service';
import { Lawyer, LawyersFilters } from '../types/lawyers.types';

export const LAWYER_KEYS = {
    all: ['lawyers'] as const,
    lists: () => [...LAWYER_KEYS.all, 'list'] as const,
    list: (filters: LawyersFilters) => [...LAWYER_KEYS.lists(), filters] as const,
    details: () => [...LAWYER_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...LAWYER_KEYS.details(), id] as const,
};

export const useLawyers = (filters?: LawyersFilters) => {
    return useQuery({
        queryKey: LAWYER_KEYS.list(filters || {}),
        queryFn: () => lawyersService.getAll(filters),
    });
};

export const useLawyer = (id: string) => {
    return useQuery({
        queryKey: LAWYER_KEYS.detail(id),
        queryFn: () => lawyersService.getById(id),
        enabled: !!id,
    });
};

export const useCreateLawyer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: lawyersService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all });
        },
    });
};

export const useUpdateLawyer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Lawyer> }) =>
            lawyersService.update(id, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all });
            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.detail(data.id) });
        },
    });
};

export const useDeleteLawyer = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: lawyersService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all });
        },
    });
};
