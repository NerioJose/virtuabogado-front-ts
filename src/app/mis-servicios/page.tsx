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
import { useAuthStore } from '@/features/auth';
import { useChatStore } from '@/features/chat/store/chatStore';
import { mapOrderToServicio, getStatusColor, getStatusText, sortServicesByDate, type ServicioCliente } from '@/features/orders';

// Importar el nuevo Panel Premium
import ClientPanel from '@/components/cliente/ClientPanel';

export default function MisServiciosPage() {
  const router = useRouter();
  const [hasHydrated, setHasHydrated] = useState(false);

  // ============ ZUSTAND STORES ============
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const logout = useAuthStore((state) => state.logout);
  const unreadOrders = useChatStore((state) => state.unreadOrders);

  // ============ REACT QUERY ============
  const { data: response, isLoading } = useOrdersByUser(user?.id || '');
  const allOrders = response?.data || [];

  // Esperar a que Zustand se hidrate since localStorage
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Verificar autenticación al montar
  useEffect(() => {
    if (hasHydrated) {
      checkAuth();
    }
  }, [hasHydrated, checkAuth]);

  // Protección de ruta - redirigir si no está autenticado
  useEffect(() => {
    if (hasHydrated && !isAuthenticated && user === null) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // Manejador de cierre de sesión
  const handleLogout = async () => {
    try {
      logout();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // ============ PROCESAMIENTO DE DATOS ============
  const servicios = useMemo(() => {
    if (!user || !allOrders) return [];
    const processedOrders = allOrders.filter((order: any) => 
        order.status !== 'PAGO_PENDIENTE' && order.status !== 'PAGO_RECHAZADO'
    );
    const mappedServices = processedOrders.map((order: any) => mapOrderToServicio(order));
    return sortServicesByDate(mappedServices);
  }, [allOrders, user]);

  // Si no se ha hidratado, mostrar loading simple
  if (!hasHydrated || !isAuthenticated || !user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
      </main>
    );
  }

  // Renderizar el nuevo Panel Premium con el Sidebar integrado
  return (
    <ClientPanel 
      user={user}
      servicios={servicios}
      unreadOrders={unreadOrders}
      isLoading={isLoading}
      handleLogout={handleLogout}
    />
  );
}