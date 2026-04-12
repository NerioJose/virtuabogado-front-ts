'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiCalendar, FiClock, FiFileText, FiExternalLink, FiDownload, FiMessageSquare, FiDollarSign } from 'react-icons/fi';
// Las imágenes en /public se sirven desde la raíz / en Next.js. No es necesario importarlas como módulos para el componente Image.

// Importar el nuevo Panel Premium
import ClientPanel from '@/features/clients/components/ClientPanel';

import { useMisServicios } from '@/features/services/hooks/useMisServicios';

export default function MisServiciosPage() {
  const {
    user,
    servicios,
    unreadOrders,
    isLoading,
    ordersLoading,
    handleLogout,
    hasHydrated,
    isAuthenticated
  } = useMisServicios();

  // ============ RENDERIZADO CONDICIONAL (Descending) ============

  // ESTADO 1: Cargando (Auth, Hidratación o Datos)
  if (isLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
      </main>
    );
  }

  // ESTADO DE SEGURIDAD: No autenticado
  if (!user && !ordersLoading) {
    return null; // El useEffect del hook manejará la redirección
  }

  // ESTADO 2: ÉXITO (Panel de Cliente)
  // Nota: Ya no bloqueamos con CasiListo, el usuario ve su panel completo de inmediato.
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