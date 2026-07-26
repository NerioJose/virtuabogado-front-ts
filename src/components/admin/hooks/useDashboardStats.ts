import { useMemo } from 'react';
import { useClients } from '@/features/clients/hooks/useClients';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import { LawyerStatus } from '@/features/lawyers/types/lawyers.types';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useQuery } from '@tanstack/react-query';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useAuthStore } from '@/features/auth/store/authStore';

export interface DashboardStatsData {
    totalAbogados: number;
    abogadosPendientes: number;
    totalClientes: number;
    casosActivos: number;
    casosPendientes: number;
    casosCompletados: number;
    ingresosMes: number;
    ingresosTotales: number;
    gananciasNetas: number;
    clientesNuevosMes: number;
    crecimientoIngresos: number;
    gastosOperativos: number;
    pagosAbogados: number;
    totalCasos: number;
}

export function useDashboardStats() {
    const user = useAuthStore(state => state.user);
    const { data: clients = [], isLoading: clientsLoading } = useClients();
    const { data: lawyers = [], isLoading: lawyersLoading } = useLawyers();
    const { data: response, isLoading: ordersLoading } = useOrders({ limit: 50 });
    const orders = (response as any)?.data || [];
    
    const { data: summary, isLoading: financialLoading } = useQuery({
        queryKey: ['FinanceSummaryDashboard', user?.id],
        queryFn: () => getFinancialSummary({ dateRange: 'all' }, { id: user!.id, rol: user!.rol as any }),
        enabled: !!user
    });

    const isLoading = clientsLoading || lawyersLoading || ordersLoading || financialLoading;

    const stats = useMemo((): DashboardStatsData => {
        const totalAbogados = lawyers.length;
        const abogadosPendientes = lawyers.filter(l => l.status === LawyerStatus.PENDING).length;
        const totalClientes = clients.length;
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const clientesNuevosMes = clients.filter(c => new Date(c.createdAt) >= thisMonth).length;
        const ordenesPaidUnassigned = orders.filter((o: any) => o.status === OrderStatus.PAID && !o.lawyerId).length;
        const ordenesActive = orders.filter((o: any) => [OrderStatus.EN_PROGRESO, OrderStatus.REVISION].includes(o.status)).length;
        const ordenesCompleted = orders.filter((o: any) => o.status === OrderStatus.COMPLETADO).length;

        return {
            totalAbogados,
            abogadosPendientes,
            totalClientes,
            casosActivos: ordenesActive,
            casosPendientes: ordenesPaidUnassigned,
            casosCompletados: ordenesCompleted,
            ingresosMes: summary?.totalIncome || 0,
            ingresosTotales: summary?.totalIncome || 0,
            gananciasNetas: summary?.realProfit || 0,
            clientesNuevosMes,
            crecimientoIngresos: 0,
            gastosOperativos: summary?.operationalCostsAndTaxes || 0,
            pagosAbogados: summary?.pendingLawyerPayments || 0,
            totalCasos: ordenesActive + ordenesPaidUnassigned + ordenesCompleted,
        };
    }, [clients, lawyers, orders, summary]);

    return {
        stats,
        isLoading,
    };
}
