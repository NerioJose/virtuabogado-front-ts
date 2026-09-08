import { useState, useMemo, useEffect } from 'react';
import { useOrders, useUpdateOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useChatStore } from '@/features/chat/store/chatStore';

export function useMensajesPanel(abogadoId: string, initialClienteId?: string | null) {
    const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');
    const [debouncedBusqueda, setDebouncedBusqueda] = useState('');
    const [page, setPage] = useState(1);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [casoParaCompletar, setCasoParaCompletar] = useState<string | null>(null);
    const updateOrder = useUpdateOrder();

    useEffect(() => {
        const t = setTimeout(() => setDebouncedBusqueda(busqueda), 300);
        return () => clearTimeout(t);
    }, [busqueda]);

    useEffect(() => {
        setPage(1);
    }, [debouncedBusqueda, initialClienteId]);

    const { data: response, isLoading } = useOrders({
        lawyerId: abogadoId,
        search: debouncedBusqueda || undefined,
        page,
        limit: 10,
    });

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

    const res = response as { data?: any[]; pagination?: any } | undefined;
    const orders = useMemo(() => res?.data || [], [res]);
    const pagination = useMemo(() => res?.pagination, [res]);

    const conversaciones = useMemo(() => {
        return orders
            .filter((order: any) => {
                if (initialClienteId && order.userId !== initialClienteId) return false;
                return true;
            })
            .map((order: any) => ({
                id: order.id,
                participante: order.userName || 'Cliente',
                ultimoMensaje: 'Ver conversación',
                fechaUltimoMensaje: order.updatedAt || order.createdAt,
                caso: order.items?.[0]?.serviceName || 'Servicio Legal',
                status: order.status
            }));
    }, [orders, initialClienteId]);

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

    const ordenActual = useMemo(() => orders.find((o: any) => o.id === conversacionActiva), [orders, conversacionActiva]);

    const unreadOrders = useChatStore((state) => state.unreadOrders);
    const unreadCounts = useChatStore((state) => state.unreadCounts);

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
        ordenActual,
        unreadOrders,
        unreadCounts,
        pagination,
        page,
        setPage,
    };
}