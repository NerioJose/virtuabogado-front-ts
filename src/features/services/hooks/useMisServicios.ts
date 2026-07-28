import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrdersByUser } from '@/features/orders/hooks/useOrders';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useChatStore } from '@/features/chat/store/chatStore';
import { mapOrderToServicio, sortServicesByDate } from '@/features/orders';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';

export function useMisServicios() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading, logout: authLogout, checkAuth } = useAuth();
    const unreadOrders = useChatStore((state) => state.unreadOrders);
    const unreadCounts = useChatStore((state) => state.unreadCounts);
    
    const { data: response, isLoading: ordersLoading } = useOrdersByUser(user?.id || '', {
        enabled: !!user?.id
    });
    
    useRealtimeSubscription();
    
    const { isLoading: settingsLoading } = useFinancialSettings({
        enabled: !!user
    });

    const [hasHydrated, setHasHydrated] = useState(false);

    useEffect(() => {
        setHasHydrated(true);
    }, []);

    useEffect(() => {
        if (hasHydrated) {
            checkAuth();
        }
    }, [hasHydrated, checkAuth]);

    useEffect(() => {
        if (hasHydrated && !isAuthenticated && !authLoading && user === null) {
            router.push('/login');
        }
    }, [hasHydrated, isAuthenticated, authLoading, user, router]);

    const handleLogout = async () => {
        try {
            await authLogout();
            router.push('/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    const servicios = useMemo(() => {
        const allOrders = (response as any)?.data || [];
        if (!user || !allOrders) return [];
        
        const processedOrders = allOrders.filter((order: any) => 
            order.status !== 'PAGO_PENDIENTE' && order.status !== 'PAGO_RECHAZADO'
        );
        const mappedServices = processedOrders.map((order: any) => mapOrderToServicio(order));
        return sortServicesByDate(mappedServices);
    }, [response, user]);

    const isLoading = !hasHydrated || authLoading || (user && ordersLoading) || settingsLoading;

    return {
        user,
        servicios,
        unreadOrders,
        unreadCounts,
        isLoading,
        ordersLoading,
        handleLogout,
        hasHydrated,
        isAuthenticated
    };
}
