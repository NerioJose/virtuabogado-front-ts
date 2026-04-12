import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { UserRole } from '@/shared/types/entities.types';
import { useQuery } from '@tanstack/react-query';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { Abogado } from '@/types/index';

export function useAbogadoPanel(abogadoId?: string) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [seccionActiva, setSeccionActiva] = useState('casos');
    const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
    const [selectedCasoId, setSelectedCasoId] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { user: userAuth, logout: storeLogout } = useAuthStore();
    const currentAbogadoId = abogadoId || userAuth?.id || ''; 

    useEffect(() => {
        const casoParam = searchParams.get('caso');
        const seccionParam = searchParams.get('seccion');

        if (casoParam) {
            setSelectedCasoId(casoParam);
            setSeccionActiva('casos');
        } else if (seccionParam) {
            setSeccionActiva(seccionParam);
        }
    }, [searchParams]);

    const { data: response, isLoading: isLoadingOrders } = useOrdersByLawyer(currentAbogadoId);
    const orders = (response as any)?.data || [];

    const { data: summary } = useQuery({
        queryKey: ['FinancialSummary', currentAbogadoId],
        queryFn: () => getFinancialSummary({ lawyerId: currentAbogadoId }, { id: userAuth?.id || '', rol: UserRole.ABOGADO }),
        enabled: !!userAuth?.id,
        staleTime: 1000 * 60 * 5,
    });

    const [abogado, setAbogado] = useState<Abogado | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userAuth) {
            setAbogado({
                id: userAuth.id,
                nombre: userAuth.nombre || userAuth.email?.split('@')[0] || 'Abogado',
                email: userAuth.email || '',
                telefono: userAuth.telefono || '',
                picture: userAuth.picture || undefined,
                especialidad: userAuth.especialidad || 'General',
                numeroColegiado: userAuth.matricula || 'N/A',
                experienciaAnios: userAuth.experiencia || 0,
                valoracionMedia: 5.0,
            });
            setLoading(false);
        } else {
            setLoading(false);
        }
    }, [userAuth]);

    const estadisticas = useMemo(() => {
        if (!orders.length) return { casosActivos: 0, casosPendientes: 0, casosCompletados: 0, clientesActivos: 0, proximaCita: new Date().toISOString(), ingresosMes: 0 };
        
        const uniqueClients = new Set();
        orders.forEach((order: any) => {
            if (order.userId) uniqueClients.add(order.userId);
        });

        return {
            casosActivos: orders.filter((o: any) => o.status === OrderStatus.EN_PROGRESO).length,
            casosPendientes: orders.filter((o: any) => o.status === OrderStatus.PENDIENTE).length,
            casosCompletados: orders.filter((o: any) => o.status === OrderStatus.COMPLETADO).length,
            clientesActivos: uniqueClients.size,
            proximaCita: new Date().toISOString(),
            ingresosMes: summary?.lawyerPendingBalance || 0,
        };
    }, [orders, summary]);

    const handleNavClick = (id: string) => {
        setSeccionActiva(id);
        setSelectedClienteId(null);
        setSelectedCasoId(null);
    };

    const handleVerDetallesCaso = (casoId: string) => {
        setSelectedCasoId(casoId);
        setSeccionActiva('casos');
    };

    const handleLogout = async () => {
        storeLogout();
        router.push('/login');
    };

    return {
        seccionActiva,
        setSeccionActiva,
        selectedClienteId,
        setSelectedClienteId,
        selectedCasoId,
        setSelectedCasoId,
        isSidebarOpen,
        setIsSidebarOpen,
        abogado,
        loading: loading || isLoadingOrders,
        estadisticas,
        handleNavClick,
        handleVerDetallesCaso,
        handleLogout,
        currentAbogadoId,
    };
}
