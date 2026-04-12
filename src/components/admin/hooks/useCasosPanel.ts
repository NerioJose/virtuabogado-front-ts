import { useState, useMemo } from 'react';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useChatStore } from '@/features/chat/store/chatStore';

export function useCasosPanel(terminoBusqueda: string) {
    const { data: response, isLoading } = useOrders({ limit: 100 });
    const orders = (response as any)?.data || [];
    const unreadOrders = useChatStore((state) => state.unreadOrders);

    const [filtroEstado, setFiltroEstado] = useState<'todos' | OrderStatus>('todos');

    const ordenesFiltradas = useMemo(() => {
        const term = terminoBusqueda.toLowerCase().trim();
        
        const getStatusPriority = (status: string): number => {
            switch (status) {
                case OrderStatus.PENDIENTE:
                case OrderStatus.PAID:
                    return 1;
                case OrderStatus.EN_PROGRESO:
                case OrderStatus.REVISION:
                    return 2;
                case OrderStatus.PAGO_PENDIENTE:
                    return 3; 
                case OrderStatus.COMPLETADO:
                    return 4;
                default:
                    return 5;
            }
        };

        const filtradas = orders.filter((orden: any) => {
            const coincideBusqueda =
                orden.userName?.toLowerCase().includes(term) ||
                orden.userEmail?.toLowerCase().includes(term) ||
                orden.items?.some((item: any) => item.serviceName?.toLowerCase().includes(term)) ||
                orden.lawyerName?.toLowerCase().includes(term) ||
                orden.id?.toLowerCase().includes(term);

            const coincideEstado =
                filtroEstado === 'todos' || orden.status === filtroEstado;

            return coincideBusqueda && coincideEstado;
        });

        return [...filtradas].sort((a: any, b: any) => {
            const priorityA = getStatusPriority(a.status as OrderStatus);
            const priorityB = getStatusPriority(b.status as OrderStatus);
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [orders, terminoBusqueda, filtroEstado]);

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
        isLoading,
        filtroEstado,
        setFiltroEstado,
        getStatusConfig,
    };
}
