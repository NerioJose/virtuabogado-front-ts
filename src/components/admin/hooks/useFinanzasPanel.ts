import { useMemo, useState, useEffect } from 'react';
import { useOrders } from '@/features/orders';
import { Order } from '@/features/orders/types/orders.types';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQuery } from '@tanstack/react-query';

export function useFinanzasPanel(terminoBusqueda: string) {
    const user = useAuthStore(state => state.user);
    const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'año' | 'all'>('mes');
    const [tabActiva, setTabActiva] = useState<'operaciones' | 'liquidaciones'>('operaciones');
    const [page, setPage] = useState(1);
    const [debouncedTerm, setDebouncedTerm] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedTerm(terminoBusqueda), 300);
        return () => clearTimeout(t);
    }, [terminoBusqueda]);

    useEffect(() => {
        setPage(1);
    }, [debouncedTerm, periodo]);

    const { data: summary, isLoading: isLoadingSummary } = useQuery({
        queryKey: ['Finance', periodo, user?.id],
        queryFn: () => getFinancialSummary({ dateRange: periodo as any }, { id: user!.id, rol: user!.rol as any }),
        enabled: !!user
    });

    const { data: response, isLoading: isLoadingOrders } = useOrders({
        limit: 10,
        page,
        search: debouncedTerm || undefined,
    });

    const res = response as { data?: Order[]; pagination?: any } | undefined;
    const ordenesFiltradas = useMemo(() => res?.data || [], [res]);
    const pagination = useMemo(() => res?.pagination, [res]);

    const isLoading = isLoadingSummary || isLoadingOrders;

    return {
        periodo,
        setPeriodo,
        tabActiva,
        setTabActiva,
        summary,
        isLoadingSummary,
        ordenesFiltradas,
        isLoadingOrders,
        isLoading,
        pagination,
        page,
        setPage,
    };
}