'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersService } from '../services/orders.service';
import { OrdersFilters, OrderStatus } from '../types/orders.types';
import { apiClient } from '@/lib/apiClient';

export const ORDER_KEYS = {
    all: ['Order'] as const,
    lists: () => [...ORDER_KEYS.all, 'list'] as const,
    list: (filters: OrdersFilters) => [...ORDER_KEYS.lists(), filters] as const,
    details: () => [...ORDER_KEYS.all, 'detail'] as const,
    detail: (id: string) => [...ORDER_KEYS.details(), id] as const,
    status: (id: string) => [...ORDER_KEYS.detail(id), 'status'] as const,
};

export function useOrders(filters?: OrdersFilters & { page?: number; limit?: number }, options?: any) {
    return useQuery({
        queryKey: ORDER_KEYS.list(filters || {}),
        queryFn: () => ordersService.getAll(filters),
        staleTime: 1000 * 60 * 2, // 2 minutes - orders change frequently
        select: (response) => response, // Default select
        ...options
    });
}

export function useOrdersByLawyer(lawyerId: string, options?: any) {
    return useOrders({ lawyerId }, options);
}

export function useOrdersByUser(userId: string, options?: any) {
    return useOrders({ userId }, options);
}

export function useOrder(id: string) {
    return useQuery({
        queryKey: ORDER_KEYS.detail(id),
        queryFn: () => ordersService.getById(id),
        enabled: !!id && id !== 'new', // Don't fetch for new orders
        staleTime: 1000 * 60 * 5, // 5 minutes - individual order details change less frequently
    });
}

export const useCreateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderData: any) => {
            return apiClient.post<any>('/api/orders', orderData);
        },
        onError: (err) => {
            console.error('❌ Error creating order:', err);
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
            console.log('✅ Orden creada (A la espera de webhook de Zenobank)');
        },
    });
};

export const useUpdateOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
            return apiClient.patch<any>(`/api/orders/${id}`, data);
        },
        onMutate: async ({ id, data }) => {
            const orderId = String(id);

            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ORDER_KEYS.detail(orderId) });
            await queryClient.cancelQueries({ queryKey: ORDER_KEYS.lists() });

            // Snapshot previous values
            const previousOrder = queryClient.getQueryData(ORDER_KEYS.detail(orderId));
            const previousLists = queryClient.getQueriesData({ queryKey: ORDER_KEYS.lists() });

            // Optimistically update detail view
            queryClient.setQueryData(ORDER_KEYS.detail(orderId), (old: any) => {
                return old ? { ...old, ...data, updatedAt: new Date() } : old;
            });

            // Optimistically update all list queries that might contain this order
            queryClient.setQueriesData({ queryKey: ORDER_KEYS.lists() }, (old: any) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.map((order: any) =>
                        String(order.id) === orderId
                            ? { ...order, ...data, updatedAt: new Date() }
                            : order
                    )
                };
            });

            return { previousOrder, previousLists, orderId };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousOrder) {
                queryClient.setQueryData(ORDER_KEYS.detail(context.orderId), context.previousOrder);
            }
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            console.error('❌ Error updating order:', err);
        },
        onSuccess: (data, { id }) => {
            // Selective invalidation - only invalidate queries that need fresh data
            const orderId = String(id);
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(orderId) });

            // Invalidate lists that might show this order
            queryClient.invalidateQueries({
                queryKey: ORDER_KEYS.lists(),
                refetchType: 'active' // Only refetch currently active queries
            });

            console.log('✅ Orden actualizada con invalidación selectiva');
        },
    });
};

export const useDeleteOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string | number) => {
            return apiClient.delete<any>(`/api/orders/${id}`);
        },
        onMutate: async (id) => {
            const orderId = String(id);
            await queryClient.cancelQueries({ queryKey: ORDER_KEYS.all });

            const previousOrders = queryClient.getQueryData(ORDER_KEYS.list({}));

            queryClient.setQueryData(ORDER_KEYS.list({}), (old: any) => {
                if (!old?.data) return old;
                return {
                    ...old,
                    data: old.data.filter((order: any) => String(order.id) !== orderId)
                };
            });

            return { previousOrders };
        },
        onError: (err, id, context) => {
            if (context?.previousOrders) {
                queryClient.setQueryData(ORDER_KEYS.list({}), context.previousOrders);
            }
            console.error('❌ Error deleting order:', err);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.lists() });
            console.log('✅ Orden eliminada y caché actualizada');
        },
    });
};

