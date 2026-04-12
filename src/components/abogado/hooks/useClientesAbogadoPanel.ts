import { useState, useMemo } from 'react';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';

export interface ClienteRecord {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  fechaAsignacion: string;
  casosActivos: number;
  casosCompletados: number;
  ultimaActividad: string;
  imagen?: string;
}

export function useClientesAbogadoPanel(abogadoId: string) {
    const { data: response, isLoading } = useOrdersByLawyer(abogadoId);
    const orders = (response as any)?.data || [];
    const [busqueda, setBusqueda] = useState('');
    const [filtroActividad, setFiltroActividad] = useState<'todos' | 'reciente' | 'inactivo'>('todos');

    const clientes: ClienteRecord[] = useMemo(() => {
        if (!orders) return [];

        const clientMap = new Map<string, ClienteRecord>();

        orders.forEach((order: any) => {
            if (!order.userId || !order.userEmail) return;

            const existingClient = clientMap.get(order.userId);

            const fechaActualizacion = new Date(order.updatedAt || order.createdAt);
            const fechaCreacion = new Date(order.createdAt);

            if (existingClient) {
                existingClient.casosActivos += (order.status === OrderStatus.EN_PROGRESO || order.status === OrderStatus.PENDIENTE) ? 1 : 0;
                existingClient.casosCompletados += order.status === OrderStatus.COMPLETADO ? 1 : 0;
                
                if (fechaActualizacion > new Date(existingClient.ultimaActividad)) {
                    existingClient.ultimaActividad = fechaActualizacion.toISOString();
                }
            } else {
                clientMap.set(order.userId, {
                    id: order.userId,
                    nombre: order.userName || order.userEmail.split('@')[0],
                    email: order.userEmail,
                    telefono: 'No registrado',
                    fechaAsignacion: fechaCreacion.toISOString(),
                    casosActivos: (order.status === OrderStatus.EN_PROGRESO || order.status === OrderStatus.PENDIENTE) ? 1 : 0,
                    casosCompletados: order.status === OrderStatus.COMPLETADO ? 1 : 0,
                    ultimaActividad: (order.updatedAt ? fechaActualizacion : fechaCreacion).toISOString()
                });
            }
        });

        return Array.from(clientMap.values());
    }, [orders]);

    const esClienteReciente = (ultimaActividad: string) => {
        const fechaActividad = new Date(ultimaActividad);
        const hoy = new Date();
        const diferenciaDias = Math.floor((hoy.getTime() - fechaActividad.getTime()) / (1000 * 60 * 60 * 24));
        return diferenciaDias <= 30;
    };

    const clientesFiltrados = useMemo(() => {
        return clientes.filter(cliente => {
            const coincideTermino =
                cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.email.toLowerCase().includes(busqueda.toLowerCase()) ||
                cliente.telefono.includes(busqueda);

            if (filtroActividad === 'todos') return coincideTermino;
            if (filtroActividad === 'reciente') return coincideTermino && esClienteReciente(cliente.ultimaActividad);
            if (filtroActividad === 'inactivo') return coincideTermino && !esClienteReciente(cliente.ultimaActividad);

            return coincideTermino;
        });
    }, [clientes, busqueda, filtroActividad]);

    return {
        clientesFiltrados,
        isLoading,
        busqueda,
        setBusqueda,
        filtroActividad,
        setFiltroActividad,
        esClienteReciente,
    };
}
