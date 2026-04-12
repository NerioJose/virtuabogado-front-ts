import React from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useCheckout } from '@/features/checkout';
import { useOrdersByUser } from '@/features/orders/hooks/useOrders';
import { useServices } from '@/features/services/hooks/useServices';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { useServicesRealtime } from '@/features/services/hooks/useServicesRealtime';
import { useFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';
import { Service } from '@/features/services/types/services.types';
import { slugify } from '@/utils/formatters';

export function useServiciosClientPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { openCheckout } = useCheckout();
    
    const { data: ordersResponse, isLoading: ordersLoading } = useOrdersByUser(user?.id || '', { 
        enabled: !!user?.id 
    });
    const orders = (ordersResponse as any)?.data || [];
    
    const { isLoading: servicesLoading } = useServices(); 
    useServicesRealtime(!!user);
    
    const { isLoading: settingsLoading } = useFinancialSettings({
        enabled: !!user
    });

    const activeServices = useServicesStore(state => state.activeServices);

    const hasPendingPayment = orders.some((order: any) => order.status === 'PAGO_PENDIENTE');
    const pendingOrder = orders.find((order: any) => order.status === 'PAGO_PENDIENTE');

    const getServiceImage = (service: Service) => {
        if (service.imagenUrl) return service.imagenUrl;
        
        const slug = slugify(service.titulo);
        const manualMap: Record<string, string> = {
            'consultas-legales': 'consulta-legal',
            'revision-de-documentos': 'revision-documentos',
            'redaccion-de-documentos': 'revision-documentos',
            'asesoria-legal': 'consulta-legal',
            'representacion-legal': 'representacion-legal',
            'asesoria-estudiantes-de-derecho': 'virtustudents.jpg'
        };

        const finalSlug = manualMap[slug] || slug;
        return finalSlug.includes('.') ? `/images/${finalSlug}` : `/images/${finalSlug}.png`;
    };

    const handleRequestService = (servicio: any) => {
        const { icono, ...serviceData } = servicio;
        openCheckout(serviceData);
    };

    const isLoading = authLoading || (user && ordersLoading) || servicesLoading || settingsLoading;

    return {
        user,
        activeServices,
        isLoading,
        hasPendingPayment,
        pendingOrder,
        getServiceImage,
        handleRequestService,
    };
}
