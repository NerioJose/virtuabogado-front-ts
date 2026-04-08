'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiCalendar, FiClock, FiFileText, FiExternalLink, FiDownload, FiMessageSquare, FiDollarSign } from 'react-icons/fi';
// Las imágenes en /public se sirven desde la raíz / en Next.js. No es necesario importarlas como módulos para el componente Image.

// React Query
import { useOrdersByUser } from '@/features/orders/hooks/useOrders';
// Zustand stores
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/features/auth';
import { useChatStore } from '@/features/chat/store/chatStore';
import { mapOrderToServicio, getStatusColor, getStatusText, sortServicesByDate, type ServicioCliente } from '@/features/orders';

// Importar el nuevo Panel Premium
import ClientPanel from '@/components/cliente/ClientPanel';

import { useServicesRealtime } from '@/features/services/hooks/useServicesRealtime';
import { useFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';
import { CasiListo } from '@/components/orders/CasiListo';

export default function MisServiciosPage() {
  const router = useRouter();
  
  // 1. REGLA DE ORO: Hooks al inicio absoluto
  const { user, isAuthenticated, isLoading: authLoading, logout: authLogout, checkAuth } = useAuth();
  const unreadOrders = useChatStore((state) => state.unreadOrders);
  
  // Blindaje de Sesión: enabled solo si hay usuario
  const { data: response, isLoading: ordersLoading } = useOrdersByUser(user?.id || '', {
    enabled: !!user?.id
  });
  
  // Sincronización en tiempo real (Opcional pero recomendado en dashboard)
  useServicesRealtime(!!user);
  
  // Guardar settings financieros
  const { isLoading: settingsLoading } = useFinancialSettings({
    enabled: !!user
  });

  const [hasHydrated, setHasHydrated] = useState(false);

  const allOrders = (response as any)?.data || [];

  // ============ EFECTOS ============
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (hasHydrated) {
      checkAuth();
    }
  }, [hasHydrated, checkAuth]);

  // Protección de ruta (Lógica después de hooks)
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

  // ============ PROCESAMIENTO DE DATOS ============
  const pendingOrder = allOrders.find((order: any) => order.status === 'PAGO_PENDIENTE');
  const hasPendingPayment = !!pendingOrder;

  const servicios = useMemo(() => {
    if (!user || !allOrders) return [];
    // Filtrar órdenes válidas para el panel principal
    const processedOrders = allOrders.filter((order: any) => 
        order.status !== 'PAGO_PENDIENTE' && order.status !== 'PAGO_RECHAZADO'
    );
    const mappedServices = processedOrders.map((order: any) => mapOrderToServicio(order));
    return sortServicesByDate(mappedServices);
  }, [allOrders, user]);

  // ============ RENDERIZADO CONDICIONAL (Descending) ============

  // ESTADO 1: Cargando (Auth, Hidratación o Datos)
  if (!hasHydrated || authLoading || (user && ordersLoading) || settingsLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
      </main>
    );
  }

  // ESTADO DE SEGURIDAD: No autenticado
  if (!user && !authLoading) {
    return null; // El useEffect manejará la redirección
  }

  // ESTADO 2: Pago en Espera
  if (hasPendingPayment && pendingOrder) {
    return <CasiListo orderId={pendingOrder.id} />;
  }

  // ESTADO 3: ÉXITO (Panel de Cliente)
  return (
    <ClientPanel 
      user={user}
      servicios={servicios}
      unreadOrders={unreadOrders}
      isLoading={ordersLoading}
      handleLogout={handleLogout}
    />
  );
}