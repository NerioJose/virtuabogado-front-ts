'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiCalendar, FiClock, FiFileText, FiExternalLink, FiDownload, FiMessageSquare, FiDollarSign } from 'react-icons/fi';
import logo from '../../../public/logo/logo_sf_1.png';

// React Query
import { useOrdersByUser } from '@/features/orders/hooks/useOrders';
// Zustand stores
import { useAuthStore } from '@/features/auth';
import { mapOrderToServicio, getStatusColor, getStatusText, sortServicesByDate, type ServicioCliente } from '@/features/orders';

// Helper for extracting name from raw or mapped user
const getDisplayName = (user: any) => {
	if (!user) return 'Usuario';
	const name = user.nombre || user.user_metadata?.nombre || user.name || user.email;
	return name !== 'Usuario' ? name : user.email;
};

export default function MisServiciosPage() {
  const router = useRouter();
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'programado' | 'completado' | 'cancelado'>('todos');
  const [hasHydrated, setHasHydrated] = useState(false);

  // ============ ZUSTAND STORES ============
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const checkAuth = useAuthStore((state) => state.checkAuth);

  // ============ REACT QUERY ============
  const { data: allOrders = [], isLoading } = useOrdersByUser(user?.id || '');
  // const allOrders = useOrdersStore((state) => state.orders); -- Legacy removed

  // Esperar a que Zustand se hidrate desde localStorage
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Verificar autenticación al montar
  useEffect(() => {
    if (hasHydrated) {
      checkAuth();
    }
  }, [hasHydrated, checkAuth]);

  // Protección de ruta - redirigir si no está autenticado (SOLO después de hidratar)
  useEffect(() => {
    if (hasHydrated && !isAuthenticated && user === null) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // ============ PROCESAMIENTO DE DATOS ============
  // Filtrar y mapear las órdenes del usuario autenticado
  const servicios = useMemo(() => {
    if (!user || !allOrders) return [];

    // Mapear a formato de servicio para la UI
    const mappedServices = allOrders.map((order: any) => mapOrderToServicio(order));

    // Ordenar por fecha (más reciente primero)
    return sortServicesByDate(mappedServices);
  }, [allOrders, user]);

  // Filtrar por estado
  const serviciosFiltrados = useMemo(() => {
    if (filtroEstado === 'todos') return servicios;
    return servicios.filter(s => s.estado === filtroEstado);
  }, [servicios, filtroEstado]);

  // Contadores por estado
  const contadores = useMemo(() => ({
    total: servicios.length,
    pendientes: servicios.filter(s => s.estado === 'pendiente').length,
    programados: servicios.filter(s => s.estado === 'programado').length,
    completados: servicios.filter(s => s.estado === 'completado').length,
    cancelados: servicios.filter(s => s.estado === 'cancelado').length,
  }), [servicios]);

  // Si no está autenticado O no se ha hidratado, mostrar loading
  if (!hasHydrated || !isAuthenticated || !user) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <Link href="/" className="inline-block">
              <Image
                src={logo}
                alt="VirtuAbogado Logo"
                width={150}
                height={50}
                className="mb-4"
              />
            </Link>
            <h1 className="text-3xl font-bold text-azul-primario">Mis Servicios</h1>
            <p className="text-gray-600 mt-1">
              Bienvenido, {getDisplayName(user)}
            </p>
          </div>
          <Link href="/servicios">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary"
            >
              Contratar nuevo servicio
            </motion.button>
          </Link>
        </div>

        {/* Estadísticas rápidas */}
        {servicios.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{contadores.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-600">{contadores.pendientes}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">En Proceso</p>
              <p className="text-2xl font-bold text-blue-600">{contadores.programados}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Completados</p>
              <p className="text-2xl font-bold text-green-600">{contadores.completados}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Cancelados</p>
              <p className="text-2xl font-bold text-red-600">{contadores.cancelados}</p>
            </div>
          </div>
        )}

        {/* Filtros */}
        {servicios.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroEstado('todos')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filtroEstado === 'todos'
                  ? 'bg-azul-primario text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Todos ({contadores.total})
              </button>
              <button
                onClick={() => setFiltroEstado('pendiente')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filtroEstado === 'pendiente'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Pendientes ({contadores.pendientes})
              </button>
              <button
                onClick={() => setFiltroEstado('programado')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filtroEstado === 'programado'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                En Proceso ({contadores.programados})
              </button>
              <button
                onClick={() => setFiltroEstado('completado')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filtroEstado === 'completado'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Completados ({contadores.completados})
              </button>
              <button
                onClick={() => setFiltroEstado('cancelado')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filtroEstado === 'cancelado'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Cancelados ({contadores.cancelados})
              </button>
            </div>
          </div>
        )}

        {/* Lista de servicios */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
          </div>
        ) : servicios.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white shadow-md rounded-xl p-8 text-center"
          >
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-azul-claro/30 mb-4">
              <FiFileText className="h-8 w-8 text-azul-primario" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No tienes servicios contratados</h2>
            <p className="text-gray-600 mb-6">
              Aún no has contratado ningún servicio legal. Explora nuestro catálogo y encuentra el servicio que necesitas.
            </p>
            <Link href="/servicios">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary"
              >
                Ver servicios disponibles
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {serviciosFiltrados.map((servicio) => (
              <motion.div
                key={servicio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* Header del servicio */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(servicio.estado)}`}>
                        {getStatusText(servicio.estado)}
                      </span>
                      <h2 className="text-xl font-semibold text-gray-900 mt-2">{servicio.nombre}</h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Orden #{servicio.numeroOrden}
                      </p>
                    </div>
                    <div className="mt-2 sm:mt-0 text-right">
                      <div className="flex items-center justify-end text-gray-600 mb-1">
                        <FiDollarSign className="w-4 h-4 mr-1" />
                        <span className="text-lg font-bold text-azul-primario">
                          ${servicio.precio.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Contratado el {servicio.fecha}</p>
                    </div>
                  </div>

                  {/* Descripción */}
                  <p className="text-gray-600 mb-4">{servicio.descripcion}</p>

                  {/* Estado específico */}
                  {servicio.estado === 'programado' && servicio.fechaCita && (
                    <div className="flex items-center mb-4 p-3 bg-blue-50 rounded-lg">
                      <FiCalendar className="text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Cita programada para el {servicio.fechaCita}</p>
                        {servicio.abogado && (
                          <p className="text-xs text-blue-700">Con {servicio.abogado}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {servicio.estado === 'pendiente' && (
                    <div className="flex items-center mb-4 p-3 bg-yellow-50 rounded-lg">
                      <FiClock className="text-yellow-600 mr-2" />
                      <p className="text-sm text-yellow-800">
                        Te contactaremos en breve para asignar un abogado y programar tu servicio
                      </p>
                    </div>
                  )}

                  {servicio.estado === 'completado' && (
                    <div className="flex items-center mb-4 p-3 bg-green-50 rounded-lg">
                      <FiFileText className="text-green-600 mr-2" />
                      <p className="text-sm text-green-800">
                        ¡Servicio completado exitosamente! Gracias por confiar en nosotros.
                      </p>
                    </div>
                  )}

                  {servicio.estado === 'cancelado' && (
                    <div className="flex items-center mb-4 p-3 bg-red-50 rounded-lg">
                      <FiFileText className="text-red-600 mr-2" />
                      <p className="text-sm text-red-800">
                        Este servicio ha sido cancelado. Si tienes preguntas, contacta a soporte.
                      </p>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href={`/detalle-servicio/${servicio.id}`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Ver detalles
                      </motion.button>
                    </Link>

                    {/* Futuro: Chat con abogado */}
                    {/* <Link href={`/chat/${servicio.id}`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-4 py-2 border border-azul-primario text-sm font-medium rounded-md text-azul-primario bg-white hover:bg-azul-claro/10"
                      >
                        <FiMessageSquare className="mr-2" />
                        Chat con abogado
                      </motion.button>
                    </Link> */}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}