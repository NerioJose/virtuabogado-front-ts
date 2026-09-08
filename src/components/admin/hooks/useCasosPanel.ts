import { useState, useMemo, useEffect } from 'react';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { Order, OrderStatus } from '@/features/orders/types/orders.types';
import { useChatStore } from '@/features/chat/store/chatStore';

export function useCasosPanel(terminoBusqueda: string) {
    const [page, setPage] = useState(1);
    const [filtroEstado, setFiltroEstado] = useState<'todos' | OrderStatus>('todos');
    const [debouncedTerm, setDebouncedTerm] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedTerm(terminoBusqueda), 300);
        return () => clearTimeout(t);
    }, [terminoBusqueda]);

    useEffect(() => {
        setPage(1);
    }, [debouncedTerm, filtroEstado]);

    const { data: response, isLoading } = useOrders({
        limit: 10,
        page,
        status: filtroEstado === 'todos' ? undefined : filtroEstado,
        search: debouncedTerm || undefined,
    });
    const res = response as { data?: Order[]; pagination?: any; countsByStatus?: Record<string, number> } | undefined;
    const orders = useMemo(() => res?.data || [], [res]);
    const pagination = useMemo(() => res?.pagination, [res]);
    const countsByStatus = useMemo(() => res?.countsByStatus || {}, [res]);
    const unreadOrders = useChatStore((state) => state.unreadOrders);
    const unreadCounts = useChatStore((state) => state.unreadCounts);

    const ordenesFiltradas = useMemo(() => {
        const filterHidden = (status: string): boolean =>
            [OrderStatus.PAGO_PENDIENTE, OrderStatus.PAGO_RECHAZADO].includes(status as OrderStatus);

        return orders.filter((orden) => !filterHidden(orden.status));
    }, [orders]);

    const visibleTotal = useMemo(() => {
        return (pagination?.total ?? 0)
            - (countsByStatus[OrderStatus.PAGO_PENDIENTE] || 0)
            - (countsByStatus[OrderStatus.PAGO_RECHAZADO] || 0);
    }, [pagination, countsByStatus]);

    const getStatusConfig = (status: OrderStatus) => {
        const config: Record<string, { label: string, color: string }> = {
            [OrderStatus.PENDIENTE]: { label: 'Por Asignar', color: 'bg-amber-100 text-amber-700 font-bold' },
            [OrderStatus.EN_PROGRESO]: { label: 'En Proceso', color: 'bg-blue-100 text-blue-700' },
            [OrderStatus.REVISION]: { label: 'En Revisión', color: 'bg-purple-100 text-purple-700' },
            [OrderStatus.COMPLETADO]: { label: 'Completado', color: 'bg-emerald-100 text-emerald-700' },
            [OrderStatus.CANCELADO]: { label: 'Cancelado', color: 'bg-rose-100 text-rose-700' },
            [OrderStatus.FALLIDO]: { label: 'Fallido', color: 'bg-red-100 text-red-700' },
            [OrderStatus.PAID]: { label: 'Pagado', color: 'bg-emerald-100 text-emerald-700' },
            [OrderStatus.PAGO_PENDIENTE]: { label: 'Pago Pend.', color: 'bg-slate-100 text-slate-500' },
            [OrderStatus.PAGO_RECHAZADO]: { label: 'Pago Rech.', color: 'bg-red-100 text-red-700' },
        };
        return config[status] || { label: status, color: 'bg-slate-100 text-slate-500' };
    };

    return {
        orders,
        ordenesFiltradas,
        unreadOrders,
        unreadCounts,
        isLoading,
        filtroEstado,
        setFiltroEstado,
        getStatusConfig,
        pagination,
        countsByStatus,
        visibleTotal,
        page,
        setPage,
    };
}
