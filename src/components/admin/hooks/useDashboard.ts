import { useMemo } from 'react';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useClients } from '@/features/clients/hooks/useClients';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import { Order, OrderStatus } from '@/features/orders/types/orders.types';

export function useDashboard() {
    const { data: ordersResponse, isLoading: isLoadingOrders } = useOrders({ limit: 50 });
    const { data: clients, isLoading: isLoadingClients } = useClients({ limit: 50 });
    const { data: lawyers, isLoading: isLoadingLawyers } = useLawyers({ limit: 50 });

    const orders: Order[] = (ordersResponse as any)?.data || [];
    const clientList = Array.isArray(clients) ? clients : [];
    const lawyerList = Array.isArray(lawyers) ? lawyers : [];

    const stats = useMemo(() => {
        const activosStates = [OrderStatus.PAID, OrderStatus.EN_PROGRESO, OrderStatus.REVISION, OrderStatus.PENDIENTE];
        const casosActivos = orders.filter((o: Order) => activosStates.includes(o.status)).length;
        const casosCompletados = orders.filter((o: Order) => o.status === OrderStatus.COMPLETADO).length;
        
        const pagosRechazados = orders.filter((o: Order) => 
            o.status === OrderStatus.PAGO_RECHAZADO || 
            o.status === OrderStatus.FALLIDO || 
            o.status === OrderStatus.CANCELADO
        ).length;

        const sinAsignar = orders.filter((o: Order) => o.status === OrderStatus.PAID && !o.lawyerId).length;
        
        const ingresosTotales = orders
            .filter((o: Order) => [OrderStatus.PAID, OrderStatus.EN_PROGRESO, OrderStatus.REVISION, OrderStatus.COMPLETADO].includes(o.status))
            .reduce((sum: number, o: Order) => sum + (o.total || 0), 0);
        
        const mesActual = new Date().getMonth();
        const anioActual = new Date().getFullYear();
        const ingresosMes = orders
            .filter((o: Order) => {
                const fecha = new Date(o.createdAt);
                return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual
                    && [OrderStatus.PAID, OrderStatus.EN_PROGRESO, OrderStatus.REVISION, OrderStatus.COMPLETADO].includes(o.status);
            })
            .reduce((sum: number, o: Order) => sum + (o.total || 0), 0);

        return { casosActivos, casosCompletados, pagosRechazados, sinAsignar, ingresosTotales, ingresosMes };
    }, [orders]);

    const casosRecientes = useMemo(() => orders.slice(0, 5), [orders]);

    const isLoading = isLoadingOrders || isLoadingClients || isLoadingLawyers;

    return {
        stats,
        casosRecientes,
        isLoading,
        clientListLength: clientList.length,
        lawyerListLength: lawyerList.length,
    };
}
