import { useMemo, useState } from 'react';
import { useOrders } from '@/features/orders';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQuery } from '@tanstack/react-query';

export function useFinanzasPanel(terminoBusqueda: string) {
    const user = useAuthStore(state => state.user);
    const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'año' | 'all'>('mes');
    const [tabActiva, setTabActiva] = useState<'operaciones' | 'liquidaciones'>('operaciones');

    const { data: summary, isLoading: isLoadingSummary } = useQuery({
        queryKey: ['Finance', periodo, user?.id],
        queryFn: () => getFinancialSummary({ dateRange: periodo as any }, { id: user!.id, rol: user!.rol as any }),
        enabled: !!user
    });

    const { data: response, isLoading: isLoadingOrders } = useOrders({ limit: 500 });
    const orders = (response as any)?.data || [];

    const ordenesFiltradas = useMemo(() => {
        const filtradas = orders.filter((order: any) => {
            if (!terminoBusqueda) return true;
            return (
                order.userName?.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
                order.userEmail?.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
                (order.numericId?.toString() || order.id.toString()).includes(terminoBusqueda)
            );
        });

        const getStatusPriority = (status: string): number => {
            switch (status) {
                case 'PENDIENTE':
                case 'PAID':
                    return 1;
                case 'EN_PROGRESO':
                case 'REVISION':
                    return 2;
                case 'PAGO_PENDIENTE':
                    return 3;
                case 'COMPLETADO':
                    return 4;
                default:
                    return 5;
            }
        };

        return [...filtradas].sort((a: any, b: any) => {
            const priorityA = getStatusPriority(a.status);
            const priorityB = getStatusPriority(b.status);
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [orders, terminoBusqueda]);

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
    };
}
