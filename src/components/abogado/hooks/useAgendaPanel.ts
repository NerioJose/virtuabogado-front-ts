import { useState, useMemo } from 'react';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';

export function useAgendaPanel(abogadoId: string) {
    const { data: response, isLoading } = useOrdersByLawyer(abogadoId);
    const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());

    const formatearFecha = (fecha: Date): string => {
        return fecha.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const cambiarDia = (dias: number) => {
        const nuevaFecha = new Date(fechaSeleccionada);
        nuevaFecha.setDate(nuevaFecha.getDate() + dias);
        setFechaSeleccionada(nuevaFecha);
    };

    const casosDelDia = useMemo(() => {
        const orders = (response as any)?.data || [];

        const getStatusPriority = (status: string) => {
            const activeStates = ['PENDIENTE', 'EN_PROGRESO', 'REVISION'];
            return activeStates.includes(status) ? 0 : 1;
        };

        return (orders as any[])
            .filter((order: any) => {
                const fechaOrder = new Date(order.createdAt);
                return fechaOrder.toDateString() === fechaSeleccionada.toDateString();
            })
            .sort((a: any, b: any) => {
                const priorityA = getStatusPriority(a.status);
                const priorityB = getStatusPriority(b.status);
                
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
    }, [response, fechaSeleccionada]);

    return {
        fechaSeleccionada,
        setFechaSeleccionada,
        casosDelDia,
        isLoading,
        cambiarDia,
        formatearFecha
    };
}
