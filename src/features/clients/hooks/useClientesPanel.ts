import { useState, useMemo, useEffect } from 'react';
import { useClientsPaginated } from '@/features/clients/hooks/useClients';
import { useOrdersStore } from '@/features/orders';

export function useClientesPanel(terminoBusqueda: string) {
    const [page, setPage] = useState(1);
    const [filtroActividad, setFiltroActividad] = useState<'todos' | 'reciente' | 'inactivo'>('todos');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const orders = useOrdersStore((state) => state.orders);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedTerm(terminoBusqueda), 300);
        return () => clearTimeout(t);
    }, [terminoBusqueda]);

    useEffect(() => {
        setPage(1);
    }, [debouncedTerm, filtroActividad]);

    const { data: response, isLoading } = useClientsPaginated({
        page,
        limit: 10,
        searchQuery: debouncedTerm || undefined,
        antiguedad: filtroActividad === 'todos' ? undefined : filtroActividad === 'reciente' ? 'reciente' : 'historico',
    });

    const clients = useMemo(() => response?.data || [], [response]);
    const total = response?.total ?? 0;
    const totalPages = response?.totalPages ?? 1;

    const getClientOrders = (clientId: string) => {
        return orders.filter(order => order.userId === clientId);
    };

    return {
        clients,
        clientesFiltrados: clients,
        filtroActividad,
        setFiltroActividad,
        getClientOrders,
        isLoading,
        total,
        totalPages,
        page,
        setPage,
    };
}