'use client';

import { useQuery } from '@tanstack/react-query';
import { ORDER_KEYS } from './useOrders';
import { getOrdersHistory, GetOrdersFilters } from '../actions/getOrdersHistory';
import { UserRole } from '@/shared/types/entities.types';

export function useOrdersHistory(filters: GetOrdersFilters, user: { id: string, rol: UserRole }) {
    return useQuery({
        queryKey: [...ORDER_KEYS.list(filters), user.id], // Consistent with ORDER_KEYS and includes userId for uniqueness
        queryFn: () => getOrdersHistory(filters, user),
        placeholderData: (previousData) => previousData, // v5 equivaent of keepPreviousData
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });
}
