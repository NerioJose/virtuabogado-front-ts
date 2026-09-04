import { useState, useMemo } from 'react';
import { useOrdersByLawyer, useUpdateOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';

export function useMensajesPanel(abogadoId: string, initialClienteId?: string | null) {
    const { data: response, isLoading } = useOrdersByLawyer(abogadoId);
    const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [casoParaCompletar, setCasoParaCompletar] = useState<string | null>(null);
    const updateOrder = useUpdateOrder();

    const openConfirmModal = (orderId: string) => {
        setCasoParaCompletar(orderId);
        setModalAbierto(true);
    };

    const handleConfirmarCompletar = async () => {
        if (!casoParaCompletar) return;
        try {
            await updateOrder.mutateAsync({
                id: casoParaCompletar,
                data: {
                    status: OrderStatus.COMPLETADO,
                    closedAt: new Date().toISOString()
                }
            });
            setModalAbierto(false);
            setCasoParaCompletar(null);
        } catch (error) {
            console.error('Error al completar el caso:', error);
            throw error;
        }
    };

    const conversaciones = useMemo(() => {
        const orders = (response as any)?.data || [];
        return orders
            .filter((order: any) => {
                if (initialClienteId && order.userId !== initialClienteId) return false;
                const term = busqueda.toLowerCase();
                return (
                    order.userName?.toLowerCase().includes(term) ||
                    order.items?.[0]?.serviceName?.toLowerCase().includes(term) ||
                    order.id.toLowerCase().includes(term)
                );
            })
            .map((order: any) => ({
                id: order.id,
                participante: order.userName || 'Cliente',
                ultimoMensaje: 'Ver conversación',
                fechaUltimoMensaje: order.updatedAt || order.createdAt,
                caso: order.items?.[0]?.serviceName || 'Servicio Legal',
                status: order.status
            }));
    }, [response, busqueda, initialClienteId]);

    const formatearFecha = (fecha: string | Date): string => {
        const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
        const hoy = new Date();
        const ayer = new Date(hoy);
        ayer.setDate(hoy.getDate() - 1);

        if (fechaObj.toDateString() === hoy.toDateString()) {
            return fechaObj.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
            });
        } else if (fechaObj.toDateString() === ayer.toDateString()) {
            return 'Ayer';
        } else {
            return fechaObj.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
            });
        }
    };

    return {
        conversacionActiva,
        setConversacionActiva,
        busqueda,
        setBusqueda,
        modalAbierto,
        setModalAbierto,
        conversaciones,
        isLoading,
        openConfirmModal,
        handleConfirmarCompletar,
        formatearFecha,
        isUpdating: updateOrder.isPending,
        ordenActual: ((response as any)?.data || []).find((o: any) => o.id === conversacionActiva)
    };
}
