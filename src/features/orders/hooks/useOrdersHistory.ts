'use client';

import { useQuery } from '@tanstack/react-query';
import { getOrdersHistory, GetOrdersFilters } from '../actions/getOrdersHistory';
import { UserRole } from '@prisma/client';

export function useOrdersHistory(filters: GetOrdersFilters, user: { id: string, rol: UserRole }) {
    return useQuery({
        queryKey: ['Order', filters, user.id], // 'Order' coincide con GlobalRealtimeProvider para reactividad automática
        queryFn: () => getOrdersHistory(filters, user),
        placeholderData: (previousData) => previousData, // v5 equivaent of keepPreviousData
        staleTime: 1000 * 60 * 5, // 5 minutos de caché
    });
}
