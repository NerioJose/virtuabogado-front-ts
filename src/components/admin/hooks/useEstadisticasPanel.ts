import { useState, useMemo } from 'react';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useClients } from '@/features/clients/hooks/useClients';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';

export type PeriodoEstadistica = 'mes' | 'trimestre' | 'año';

export function useEstadisticasPanel() {
    const [periodo, setPeriodo] = useState<PeriodoEstadistica>('mes');

    const { data: response, isLoading: isLoadingOrders } = useOrders({ limit: 100 });
    const orders = useMemo(() => (response as any)?.data || [], [response]);
    const { data: clients = [] } = useClients();
    const { data: lawyers = [] } = useLawyers();

    const estadisticas = useMemo(() => {
        if (orders.length === 0) {
            return {
                totalOrdenes: 0,
                totalClientes: clients.length,
                totalAbogados: lawyers.length,
                ingresosTotales: 0,
                promedioOrden: 0,
                completadas: 0,
                pendientes: 0
            };
        }

        const ingresosTotales = orders.reduce((sum: number, order: any) => sum + order.total, 0);
        const promedioOrden = ingresosTotales / orders.length;
        const completadas = orders.filter((o: any) => o.status === OrderStatus.COMPLETADO).length;
        const pendientes = orders.filter((o: any) => o.status === OrderStatus.PENDIENTE).length;

        return {
            totalOrdenes: orders.length,
            totalClientes: clients.length,
            totalAbogados: lawyers.length,
            ingresosTotales,
            promedioOrden,
            completadas,
            pendientes
        };
    }, [orders, clients.length, lawyers.length]);

    const isLoading = isLoadingOrders;

    return {
        periodo,
        setPeriodo,
        orders,
        estadisticas,
        isLoading
    };
}
