import { useState, useMemo, useEffect } from 'react';
import { useLawyersPaginated } from '@/features/lawyers/hooks/useLawyers';
import { LawyerStatus } from '@/features/lawyers/types/lawyers.types';

export function useAbogadosPanel(terminoBusqueda: string) {
    const [page, setPage] = useState(1);
    const [especialidadFilter, setEspecialidadFilter] = useState<string>('todas');
    const [statusFilter, setStatusFilter] = useState<'ALL' | LawyerStatus>('ALL');
    const [debouncedTerm, setDebouncedTerm] = useState('');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedTerm(terminoBusqueda), 300);
        return () => clearTimeout(t);
    }, [terminoBusqueda]);

    useEffect(() => {
        setPage(1);
    }, [debouncedTerm, especialidadFilter, statusFilter]);

    const { data: response, isLoading } = useLawyersPaginated({
        page,
        limit: 10,
        searchQuery: debouncedTerm || undefined,
        especialidad: especialidadFilter === 'todas' ? undefined : especialidadFilter as any,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
    });

    const lawyers = useMemo(() => response?.data || [], [response]);
    const total = response?.total ?? 0;
    const totalPages = response?.totalPages ?? 1;

    const especialidades = useMemo(() => {
        const specs = new Set<string>();
        lawyers.forEach(l => specs.add(l.especialidad));
        return Array.from(specs).sort();
    }, [lawyers]);

    const updateStatus = async (id: string, status: LawyerStatus) => {
        // En una implementación real, aquí se llamaría al servicio de abogados
        // useLawyers ya maneja mutaciones, pero por ahora simulamos la lógica
    };

    return {
        lawyers,
        filteredLawyers: lawyers,
        especialidades,
        especialidadFilter,
        setEspecialidadFilter,
        statusFilter,
        setStatusFilter,
        updateStatus,
        isLoading,
        total,
        totalPages,
        page,
        setPage,
    };
}