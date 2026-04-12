import { useState, useMemo } from 'react';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import { LawyerStatus } from '@/features/lawyers/types/lawyers.types';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';

export function useAbogadosPanel(terminoBusqueda: string) {
    const { data: lawyers = [], isLoading } = useLawyers();
    const { data: ordersResponse } = useOrders();
    const orders = (ordersResponse as any)?.data || [];

    const [especialidadFilter, setEspecialidadFilter] = useState<string>('todas');
    const [statusFilter, setStatusFilter] = useState<'ALL' | LawyerStatus>('ALL');

    const especialidades = useMemo(() => {
        const specs = new Set<string>();
        lawyers.forEach(l => specs.add(l.especialidad));
        return Array.from(specs).sort();
    }, [lawyers]);

    const filteredLawyers = useMemo(() => {
        const term = terminoBusqueda.toLowerCase().trim();
        return lawyers.filter(lawyer => {
            const matchesSearch =
                lawyer.nombre?.toLowerCase().includes(term) ||
                lawyer.email?.toLowerCase().includes(term) ||
                (lawyer.telefono && lawyer.telefono.includes(term));
            const matchesSpecialty = especialidadFilter === 'todas' || lawyer.especialidad === especialidadFilter;
            const matchesStatus = statusFilter === 'ALL' || lawyer.status === statusFilter;
            return matchesSearch && matchesSpecialty && matchesStatus;
        });
    }, [lawyers, terminoBusqueda, especialidadFilter, statusFilter]);

    const getActiveCases = (lawyerId: string) => {
        return orders.filter((o: any) => o.lawyerId === lawyerId && o.status === OrderStatus.EN_PROGRESO).length;
    };

    const updateStatus = async (id: string, status: LawyerStatus) => {
        // En una implementación real, aquí se llamaría al servicio de abogados
        // useLawyers ya maneja mutaciones, pero por ahora simulamos la lógica
        console.log('Implement change status', id, status);
        // await mutateStatus({ id, status });
    };

    return {
        lawyers,
        filteredLawyers,
        especialidades,
        especialidadFilter,
        setEspecialidadFilter,
        statusFilter,
        setStatusFilter,
        getActiveCases,
        updateStatus,
        isLoading,
    };
}
