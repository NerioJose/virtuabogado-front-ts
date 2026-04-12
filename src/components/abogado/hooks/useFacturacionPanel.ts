import { useState, useMemo } from 'react';
import { useOrdersByLawyer, useUpdateOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { getPayoutHistory } from '@/features/finance/actions/payoutActions';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQuery } from '@tanstack/react-query';

export interface Factura {
    id: string;
    numero: string;
    cliente: string;
    clienteEmail: string;
    concepto: string;
    fecha: string;
    importeBruto: number;
    importeNeto: number;
    estado: 'liquidada' | 'procesando' | 'por_liquidar' | 'pendiente' | 'vencida';
}

export type PeriodoFacturacion = 'mes' | 'trimestre' | 'año';

export function useFacturacionPanel(abogadoId: string) {
    const user = useAuthStore(state => state.user);
    const { data: response, isLoading: isLoadingOrders } = useOrdersByLawyer(abogadoId);
    const orders = (response as any)?.data || [];
    const updateOrder = useUpdateOrder();
    
    const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
    const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
    const [notificacion, setNotificacion] = useState<{ tipo: 'success' | 'info', mensaje: string } | null>(null);
    const [periodo, setPeriodo] = useState<PeriodoFacturacion>('mes');
    const [filtroEstado, setFiltroEstado] = useState<
        'todas' | 'liquidada' | 'procesando' | 'por_liquidar' | 'pendientes'
    >('todas');

    const { data: summary, isLoading: isLoadingSummary } = useQuery({
        queryKey: ['Finance', periodo, abogadoId],
        queryFn: () => getFinancialSummary({ lawyerId: abogadoId, dateRange: periodo as any }, { id: user!.id, rol: user!.rol as any }),
        enabled: !!user
    });

    const { data: payoutHistory = [] as any[] } = useQuery({
        queryKey: ['PayoutHistory', abogadoId],
        queryFn: () => getPayoutHistory(abogadoId),
        enabled: !!abogadoId,
        refetchInterval: 15000
    });

    const payoutStatusMap = useMemo(() => {
        const map: Record<string, string> = {};
        payoutHistory.forEach((payout: any) => {
            payout.orders?.forEach((order: any) => {
                map[order.id] = payout.status;
            });
        });
        return map;
    }, [payoutHistory]);

    const facturas: Factura[] = useMemo(() => {
        return orders
            .filter((o: any) => ['PAID', 'EN_PROGRESO', 'REVISION', 'COMPLETADO'].includes(o.status))
            .map((o: any) => {
                let estado: Factura['estado'] = 'pendiente';
                
                if (o.status === OrderStatus.COMPLETADO) {
                    const resolvedPayoutStatus = payoutStatusMap[o.id] ?? (o as any).payoutStatus;
                    
                    if (resolvedPayoutStatus === 'COMPLETADO') {
                        estado = 'liquidada';
                    } else if (resolvedPayoutStatus === 'PENDIENTE') {
                        estado = 'procesando';
                    } else {
                        estado = 'por_liquidar';
                    }
                }

                return {
                    id: o.id.toString(),
                    numero: `F-${o.numericId || o.id.toString().slice(0, 8)}`,
                    cliente: o.userName || 'Cliente',
                    clienteEmail: o.userEmail || '',
                    concepto: o.items?.[0]?.serviceName || 'Servicios Legales',
                    fecha: new Date(o.createdAt).toISOString().split('T')[0],
                    importeBruto: Number(o.total),
                    importeNeto: Number((o as any).commissionAmount || o.total),
                    estado
                };
            });
    }, [orders, payoutStatusMap]);

    const facturasFiltradas = facturas.filter((factura) => {
        if (filtroEstado === 'todas') return true;
        if (filtroEstado === 'liquidada') return factura.estado === 'liquidada';
        if (filtroEstado === 'procesando') return factura.estado === 'procesando';
        if (filtroEstado === 'por_liquidar') return factura.estado === 'por_liquidar';
        if (filtroEstado === 'pendientes') return factura.estado === 'pendiente';
        return true;
    });

    const isLoading = isLoadingOrders || isLoadingSummary;

    const handleDescargar = (factura: Factura) => {
        setNotificacion({
            tipo: 'info',
            mensaje: `Generando PDF para ${factura.numero}...`
        });

        setTimeout(() => {
            window.print();
            setNotificacion({
                tipo: 'success',
                mensaje: `Factura ${factura.numero} lista para imprimir.`
            });
        }, 1000);
    };

    const handleMarcarPagada = (factura: Factura) => {
        setFacturaSeleccionada(factura);
        setMostrarModalConfirmacion(true);
    };

    const confirmarPago = async () => {
        if (!facturaSeleccionada) return;

        try {
            await updateOrder.mutateAsync({
                id: facturaSeleccionada.id,
                data: {
                    status: OrderStatus.COMPLETADO,
                    closedAt: new Date().toISOString()
                }
            });

            setNotificacion({
                tipo: 'success',
                mensaje: `Factura ${facturaSeleccionada.numero} marcada como pagada exitosamente.`
            });
            setMostrarModalConfirmacion(false);
            setFacturaSeleccionada(null);
        } catch (error) {
            console.error('Error al actualizar factura:', error);
            setNotificacion({
                tipo: 'info',
                mensaje: 'Error al actualizar el estado de la factura.'
            });
        }
    };

    return {
        summary,
        facturasFiltradas,
        isLoading,
        notificacion,
        periodo,
        setPeriodo,
        filtroEstado,
        setFiltroEstado,
        facturaSeleccionada,
        setFacturaSeleccionada,
        mostrarModalConfirmacion,
        setMostrarModalConfirmacion,
        handleDescargar,
        handleMarcarPagada,
        confirmarPago,
        isUpdating: updateOrder.isPending,
    };
}
