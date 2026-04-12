import { useState, useMemo } from 'react';
import { useClients } from '@/features/clients/hooks/useClients';
import { useOrdersStore } from '@/features/orders';

export function useClientesPanel(terminoBusqueda: string) {
    const { data: clients = [], isLoading } = useClients();
    const orders = useOrdersStore((state) => state.orders);

    const [filtroActividad, setFiltroActividad] = useState<'todos' | 'reciente' | 'inactivo'>('todos');

    const esClienteReciente = (createdAt: Date | string) => {
        const hoy = new Date();
        const fechaRegistro = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
        const diferenciaDias = Math.floor((hoy.getTime() - fechaRegistro.getTime()) / (1000 * 60 * 60 * 24));
        return diferenciaDias <= 30;
    };

    const clientesFiltrados = useMemo(() => {
        const term = terminoBusqueda.toLowerCase().trim();
        return clients.filter(cliente => {
            const coincideTermino =
                cliente.nombre?.toLowerCase().includes(term) ||
                cliente.email?.toLowerCase().includes(term) ||
                (cliente.telefono && cliente.telefono.includes(term)) ||
                cliente.id?.toLowerCase().includes(term);

            if (filtroActividad === 'todos') return coincideTermino;
            if (filtroActividad === 'reciente') return coincideTermino && esClienteReciente(cliente.createdAt);
            if (filtroActividad === 'inactivo') return coincideTermino && !esClienteReciente(cliente.createdAt);
            return coincideTermino;
        });
    }, [clients, terminoBusqueda, filtroActividad]);

    const getClientOrders = (clientId: string) => {
        return orders.filter(order => order.userId === clientId);
    };

    return {
        clients,
        clientesFiltrados,
        filtroActividad,
        setFiltroActividad,
        getClientOrders,
        isLoading,
    };
}
