'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiUserCheck, 
  FiBriefcase, 
  FiDollarSign, 
  FiAlertCircle,
  FiTrendingUp, 
  FiCalendar,
  FiClock,
  FiCheckCircle
} from 'react-icons/fi';
import { formatCurrency } from '@/utils/formatters';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { useClients } from '@/features/clients/hooks/useClients';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import { Order, OrderStatus } from '@/features/orders/types/orders.types';

export default function Dashboard() {
  const { data: ordersResponse, isLoading: isLoadingOrders } = useOrders({ limit: 200 });
  const { data: clients, isLoading: isLoadingClients } = useClients();
  const { data: lawyers, isLoading: isLoadingLawyers } = useLawyers();

  // useOrders returns { data: Order[], ... }
  const orders: Order[] = (ordersResponse as any)?.data || [];
  // useClients and useLawyers return the array directly
  const clientList = Array.isArray(clients) ? clients : [];
  const lawyerList = Array.isArray(lawyers) ? lawyers : [];

  const stats = useMemo(() => {
    const activosStates = [OrderStatus.PAID, OrderStatus.EN_PROGRESO, OrderStatus.REVISION, OrderStatus.PENDIENTE];
    const casosActivos = orders.filter((o: Order) => activosStates.includes(o.status)).length;
    const casosCompletados = orders.filter((o: Order) => o.status === OrderStatus.COMPLETADO).length;
    
    // Pagos rechazados: órdenes con status PAGO_RECHAZADO
    const pagosRechazados = orders.filter((o: Order) => 
      o.status === OrderStatus.PAGO_RECHAZADO || 
      o.status === OrderStatus.FALLIDO || 
      o.status === OrderStatus.CANCELADO
    ).length;

    // Casos sin abogado asignado (PAID = pago aprobado pero sin abogado aún)
    const sinAsignar = orders.filter((o: Order) => o.status === OrderStatus.PAID && !o.lawyerId).length;
    
    const ingresosTotales = orders
      .filter((o: Order) => [OrderStatus.PAID, OrderStatus.EN_PROGRESO, OrderStatus.REVISION, OrderStatus.COMPLETADO].includes(o.status))
      .reduce((sum: number, o: Order) => sum + (o.total || 0), 0);
    
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();
    const ingresosMes = orders
      .filter((o: Order) => {
        const fecha = new Date(o.createdAt);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === anioActual
          && [OrderStatus.PAID, OrderStatus.EN_PROGRESO, OrderStatus.REVISION, OrderStatus.COMPLETADO].includes(o.status);
      })
      .reduce((sum: number, o: Order) => sum + (o.total || 0), 0);

    return { casosActivos, casosCompletados, pagosRechazados, sinAsignar, ingresosTotales, ingresosMes };
  }, [orders]);

  // Casos recientes para la tabla
  const casosRecientes = useMemo(() => orders.slice(0, 5), [orders]);

  const isLoading = isLoadingOrders || isLoadingClients || isLoadingLawyers;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-azul-primario">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <FiCalendar className="text-gray-500" />
          <span className="text-gray-500">{new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Total Clientes</p>
              <h3 className="text-3xl font-bold text-azul-primario mt-2">{clientList.length}</h3>
            </div>
            <div className="w-12 h-12 bg-azul-claro/20 rounded-lg flex items-center justify-center text-azul-primario">
              <FiUsers size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-gray-500 text-sm">
            <FiTrendingUp className="mr-1" />
            <span>Clientes activos en la plataforma</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Total Abogados</p>
              <h3 className="text-3xl font-bold text-azul-primario mt-2">{lawyerList.length}</h3>
            </div>
            <div className="w-12 h-12 bg-azul-claro/20 rounded-lg flex items-center justify-center text-azul-primario">
              <FiUserCheck size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-500 text-sm">
            <FiTrendingUp className="mr-1" />
            <span>Abogados registrados y activos</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Casos Activos</p>
              <h3 className="text-3xl font-bold text-azul-primario mt-2">{stats.casosActivos}</h3>
            </div>
            <div className="w-12 h-12 bg-azul-claro/20 rounded-lg flex items-center justify-center text-azul-primario">
              <FiBriefcase size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">{stats.casosCompletados} completados en total</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Ingresos Mes Actual</p>
              <h3 className="text-3xl font-bold text-azul-primario mt-2">{formatCurrency(stats.ingresosMes)}</h3>
            </div>
            <div className="w-12 h-12 bg-azul-claro/20 rounded-lg flex items-center justify-center text-azul-primario">
              <FiDollarSign size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-gray-500 text-sm">
            <FiTrendingUp className="mr-1" />
            <span>Total acumulado: {formatCurrency(stats.ingresosTotales)}</span>
          </div>
        </motion.div>
      </div>
      
      {/* Casos recientes */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-azul-primario">Casos Recientes</h2>
          <button className="text-sm text-azul-primario hover:underline">Ver todos</button>
        </div>
        
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="min-w-[800px] divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caso</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abogado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {casosRecientes.map((caso: Order) => (
                <tr key={caso.id} className={`hover:bg-gray-50 ${caso.status === OrderStatus.COMPLETADO ? 'opacity-60 grayscale-[0.2]' : ''}`}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-azul-primario">#{caso.numericId}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{caso.userName}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {caso.lawyerName || (
                        <span className="text-amber-500 flex items-center">
                          <FiClock className="mr-1" size={14} />
                          Sin asignar
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{new Date(caso.createdAt).toLocaleDateString('es-ES')}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${
                      caso.status === OrderStatus.PENDIENTE || caso.status === OrderStatus.PAGO_PENDIENTE ? 'bg-yellow-100 text-yellow-800' :
                      caso.status === OrderStatus.EN_PROGRESO || caso.status === OrderStatus.PAID ? 'bg-blue-100 text-blue-800' :
                      caso.status === OrderStatus.REVISION ? 'bg-indigo-100 text-indigo-800' :
                      caso.status === OrderStatus.COMPLETADO ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {caso.status === OrderStatus.COMPLETADO && <FiCheckCircle size={10} />}
                      {caso.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                    {formatCurrency(caso.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
      
      {/* Alertas y notificaciones REALES */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex items-center mb-6">
          <FiAlertCircle className="text-amber-500 mr-2" size={20} />
          <h2 className="text-xl font-bold text-azul-primario">Alertas y Notificaciones</h2>
        </div>
        
        <div className="space-y-4">
          {stats.sinAsignar > 0 ? (
            <div className="p-4 border border-amber-200 rounded-lg bg-amber-50 flex items-start">
              <FiAlertCircle className="text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 font-medium">{stats.sinAsignar} caso{stats.sinAsignar !== 1 ? 's' : ''} pendiente{stats.sinAsignar !== 1 ? 's' : ''} de asignación</p>
                <p className="text-amber-600 text-sm mt-1">Hay pagos aprobados que requieren asignación de abogado.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 border border-green-200 rounded-lg bg-green-50 flex items-start">
              <FiCheckCircle className="text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-800 font-medium">Todo asignado</p>
                <p className="text-green-600 text-sm mt-1">No hay casos pendientes de asignación.</p>
              </div>
            </div>
          )}

          {stats.pagosRechazados > 0 && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50 flex items-start">
              <FiAlertCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-800 font-medium">{stats.pagosRechazados} pago{stats.pagosRechazados !== 1 ? 's' : ''} rechazado{stats.pagosRechazados !== 1 ? 's' : ''} o cancelado{stats.pagosRechazados !== 1 ? 's' : ''}</p>
                <p className="text-red-600 text-sm mt-1">Revisa el panel de casos para más detalles.</p>
              </div>
            </div>
          )}

          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 flex items-start">
            <FiAlertCircle className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-800 font-medium">{stats.casosActivos} caso{stats.casosActivos !== 1 ? 's' : ''} activo{stats.casosActivos !== 1 ? 's' : ''} en progreso</p>
              <p className="text-blue-600 text-sm mt-1">{stats.casosCompletados} casos completados hasta la fecha.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}