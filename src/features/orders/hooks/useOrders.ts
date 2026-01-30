import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '../services/orders.service';
import { OrdersFilters, OrderStatus } from '../types/orders.types';
import { apiClient } from '@/lib/apiClient';

export const ORDER_KEYS = {
    all: ['orders'] as const,
    lists: () => [...ORDER_KEYS.all, 'list'] as const,
    list: (filters: OrdersFilters) => [...ORDER_KEYS.lists(), filters] as const,
    details: () => [...ORDER_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...ORDER_KEYS.details(), id] as const,
};

export function useOrders(filters?: OrdersFilters) {
    return useQuery({
        queryKey: ORDER_KEYS.list(filters || {}),
        queryFn: () => ordersService.getAll(filters),
    });
}

export function useOrdersByLawyer(lawyerId: string) {
    return useOrders({ lawyerId });
}

export function useOrdersByUser(userId: string) {
    return useOrders({ userId });
}

export function useOrder(id: string) {
    return useQuery({
        queryKey: ORDER_KEYS.detail(id),
        queryFn: () => ordersService.getById(Number(id)),
        enabled: !!id,
    });
}

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderData: any) => {
            return apiClient.post<any>('/api/orders', orderData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
            console.log('✅ Orden creada y caché invalidada');
        },
    });
};

export const useUpdateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
            // Using PATCH for partial updates (e.g. assigning lawyer)
            return apiClient.patch<any>(`/api/orders/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
            console.log('✅ Orden actualizada y caché invalidada');
        },
    });
};
