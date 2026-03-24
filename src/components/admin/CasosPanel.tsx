/**
 * Panel de Casos/Órdenes - Conectado a ordersStore
 * Muestra las órdenes (servicios contratados) en tiempo real
 */

import { useMemo, memo } from 'react';
import { FiEdit, FiTrash2, FiEye, FiFilter, FiUserPlus } from 'react-icons/fi';
import { ElementoSeleccionable } from '@/types/index';
// import { useOrdersStore } from '@/features/orders';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useState } from 'react';

interface CasosPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: ElementoSeleccionable) => void;
}

function CasosPanel({ terminoBusqueda, abrirModal }: CasosPanelProps) {
  // ============ REACT QUERY HOOK ============
  const { data: orders = [] } = useOrders();

  const [filtroEstado, setFiltroEstado] = useState<'todos' | OrderStatus>('todos');

  // Filtrar órdenes según término de búsqueda y estado
  const ordenesFiltradas = useMemo(() => {
    return orders.filter(order => {
      const coincideTermino =
        order.userName.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        order.userEmail.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        order.items.some(item =>
          item.serviceName.toLowerCase().includes(terminoBusqueda.toLowerCase())
        ) ||
        (order.lawyerName && order.lawyerName.toLowerCase().includes(terminoBusqueda.toLowerCase()));

      const coincideEstado = filtroEstado === 'todos' || order.status === filtroEstado;

      return coincideTermino && coincideEstado;
    });
  }, [orders, terminoBusqueda, filtroEstado]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center">
          <FiFilter className="text-gray-500 mr-2" />
          <span className="text-gray-700 font-medium">Filtrar por estado:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === 'todos'
              ? 'bg-azul-primario text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
            Todos
          </button>
          <button
            onClick={() => setFiltroEstado(OrderStatus.PENDING)}
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === OrderStatus.PENDING
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
            Pendientes
          </button>
          <button
            onClick={() => setFiltroEstado(OrderStatus.PROCESSING)}
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === OrderStatus.PROCESSING
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
            En proceso
          </button>
          <button
            onClick={() => setFiltroEstado(OrderStatus.COMPLETED)}
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === OrderStatus.COMPLETED
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
            Completados
          </button>
          <button
            onClick={() => setFiltroEstado(OrderStatus.CANCELLED)}
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === OrderStatus.CANCELLED
              ? 'bg-red-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
            Cancelados
          </button>
        </div>
      </div>

      {/* Tabla de órdenes/casos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Orden
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abogado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ordenesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    {orders.length === 0
                      ? 'No hay órdenes registradas'
                      : 'No se encontraron órdenes con los criterios de búsqueda'}
                  </td>
                </tr>
              ) : (
                ordenesFiltradas.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-azul-primario">#{order.numericId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{order.userName}</div>
                      <div className="text-sm text-gray-500">{order.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">
                        {order.items.map(item => item.serviceName).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-bold rounded-full ${order.lawyerId 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100 italic'
                        }`}>
                          {order.lawyerId ? '⚖️ ' : '⏳ '}
                          {order.lawyerName || 'Sin asignar'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString('es-ES')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${order.total.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === OrderStatus.PENDING ? 'bg-yellow-100 text-yellow-800' :
                        order.status === OrderStatus.PROCESSING ? 'bg-blue-100 text-blue-800' :
                          order.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-800' :
                            order.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {order.status === OrderStatus.PENDING ? 'Pendiente' :
                          order.status === OrderStatus.PROCESSING ? 'En proceso' :
                            order.status === OrderStatus.COMPLETED ? 'Completado' :
                              order.status === OrderStatus.CANCELLED ? 'Cancelado' :
                                'Fallido'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => abrirModal('asignar', order as unknown as ElementoSeleccionable)}
                          className="text-green-600 hover:text-green-700"
                          title="Asignar Abogado">
                          <FiUserPlus />
                        </button>
                        <button
                          onClick={() => abrirModal('ver', order as unknown as ElementoSeleccionable)}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles">
                          <FiEye />
                        </button>
                        <button
                          onClick={() => abrirModal('editar', order as unknown as ElementoSeleccionable)}
                          className="text-amber-500 hover:text-amber-600"
                          title="Editar">
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => abrirModal('eliminar', order as unknown as ElementoSeleccionable)}
                          className="text-red-500 hover:text-red-600"
                          title="Eliminar">
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default memo(CasosPanel);