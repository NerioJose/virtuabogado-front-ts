import { useState, useMemo, useEffect } from 'react';
import { useChatStore } from '@/features/chat/store/chatStore';
import { useOrdersByLawyer, useUpdateOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';

export function useCasosAbogadoPanel(abogadoId: string, initialClienteId?: string | null, initialCasoId?: string | null) {
    const { data: response, isLoading } = useOrdersByLawyer(abogadoId);
    const misCasos = useMemo(() => (response as any)?.data || [], [response]);

    const unreadOrders = useChatStore((state) => state.unreadOrders);
    const unreadCounts = useChatStore((state) => state.unreadCounts);
    const [filtroEstado, setFiltroEstado] = useState<'todos' | OrderStatus>('todos');
    const [casoSeleccionado, setCasoSeleccionado] = useState<string | null>(null);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [casoParaCompletar, setCasoParaCompletar] = useState<string | null>(null);
    const updateOrder = useUpdateOrder();

    useEffect(() => {
        setCasoSeleccionado(initialCasoId || null);
    }, [initialCasoId]);

    const openConfirmModal = (orderId: string) => {
        setCasoParaCompletar(orderId);
        setModalAbierto(true);
    };

    const handleConfirmarCompletar = () => {
        if (!casoParaCompletar) return;

        updateOrder.mutate({
            id: casoParaCompletar,
            data: {
                status: OrderStatus.COMPLETADO,
                closedAt: new Date().toISOString()
            }
        });

        setModalAbierto(false);
        setCasoParaCompletar(null);
    };

    const casosFiltrados = useMemo(() => {
        const getStatusPriority = (status: string) => {
            const activeStates = [OrderStatus.PENDIENTE, OrderStatus.EN_PROGRESO, OrderStatus.REVISION];
            return activeStates.includes(status as OrderStatus) ? 0 : 1;
        };

        return misCasos
            .filter((caso: any) => {
                const matchEstado = filtroEstado === 'todos' || caso.status === filtroEstado;
                const matchCliente = initialClienteId ? caso.userId === initialClienteId : true;
                return matchEstado && matchCliente;
            })
            .sort((a: any, b: any) => {
                const priorityA = getStatusPriority(a.status);
                const priorityB = getStatusPriority(b.status);

                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }

                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [misCasos, filtroEstado, initialClienteId]);

    return {
        misCasos,
        casosFiltrados,
        isLoading,
        unreadOrders,
        unreadCounts,
        filtroEstado,
        setFiltroEstado,
        casoSeleccionado,
        setCasoSeleccionado,
        modalAbierto,
        setModalAbierto,
        openConfirmModal,
        handleConfirmarCompletar,
        isUpdating: updateOrder.isPending,
    };
}
