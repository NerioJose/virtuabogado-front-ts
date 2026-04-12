import { useState } from 'react';
import { useOrdersHistory } from './useOrdersHistory';
import { GetOrdersFilters } from '../actions/getOrdersHistory';
import { UserRole } from '@/shared/types/entities.types';

export function useOrdersHistoryTable(user: { id: string, rol: UserRole }) {
    const [filters, setFilters] = useState<GetOrdersFilters>({
        page: 1,
        limit: 10,
        status: undefined,
        dateRange: undefined,
        search: '',
    });

    const { data, isLoading, isPlaceholderData } = useOrdersHistory(filters, user);

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const handleFilterChange = (key: keyof GetOrdersFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    return {
        filters,
        data,
        isLoading,
        isPlaceholderData,
        handlePageChange,
        handleFilterChange,
    };
}
