import { useState, useEffect, memo, useMemo } from 'react';
import { FiEye, FiMessageSquare, FiFileText, FiFilter, FiArrowLeft } from 'react-icons/fi';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
import { useChatStore } from '@/features/chat/store/chatStore';
import { motion } from 'framer-motion';
import { useOrdersByLawyer, useUpdateOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';

interface CasosAbogadoPanelProps {
  abogadoId: string;
  initialClienteId?: string | null;
  initialCasoId?: string | null;
}

function CasosAbogadoPanel({ abogadoId, initialClienteId, initialCasoId }: CasosAbogadoPanelProps) {
  // ============ REACT QUERY ============
  const { data: response, isLoading } = useOrdersByLawyer(abogadoId);
  const misCasos = response?.data || [];
  const unreadOrders = useChatStore((state) => state.unreadOrders);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | OrderStatus>('todos');
  const [casoSeleccionado, setCasoSeleccionado] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [casoParaCompletar, setCasoParaCompletar] = useState<string | null>(null);
  const updateOrder = useUpdateOrder();

  // Sincronizar caso seleccionado inicial
  useEffect(() => {
    setCasoSeleccionado(initialCasoId || null);
  }, [initialCasoId]);

  const openConfirmModal = (orderId: string) => {
    setCasoParaCompletar(orderId);
    setModalAbierto(true);
  };

  const handleConfirmarCompletar = () => {
    if (!casoParaCompletar) return;
    
    // Optimizamos flujo: Cerramos modal y lanzamos mutación sin esperar (Optimistic UI)
    updateOrder.mutate({
      id: casoParaCompletar,
      data: { 
        status: OrderStatus.COMPLETADO,
        closedAt: new Date().toISOString()
      }
    });

    setModalAbierto(false);
    setCasoParaCompletar(null);
  };

  // Ya no necesitamos useEffect para fetchOrders porque useQuery lo maneja automáticamente
  // ni useMemo para filtrar por abogado porque el hook ya lo hace en el servidor

  // Filtrar casos según filtro de estado
  const casosFiltrados = useMemo(() => {
    return misCasos.filter(caso => {
      const matchEstado = filtroEstado === 'todos' || caso.status === filtroEstado;
      const matchCliente = initialClienteId ? caso.userId === initialClienteId : true;
      return matchEstado && matchCliente;
    });
  }, [misCasos, filtroEstado, initialClienteId]);

  if (isLoading && misCasos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Vista de Chat/Detalle
  if (casoSeleccionado) {
    const caso = misCasos.find(c => c.id === casoSeleccionado);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCasoSeleccionado(null)}
            className="flex items-center text-gray-600 hover:text-azul-primario transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Volver a mis casos
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            Chat: {caso?.items[0]?.serviceName || 'Caso'}
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda: Detalles rápidos */}
          <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm h-fit">
            <h3 className="font-semibold text-gray-700 mb-4">Información del Caso</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500">Cliente</p>
                <p className="font-medium">{caso?.userName || caso?.userEmail}</p>
              </div>
              <div>
                <p className="text-gray-500">Servicio</p>
                <p className="font-medium">{caso?.items[0]?.serviceName}</p>
              </div>
              <div>
                <p className="text-gray-500">Estado</p>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${caso?.status === OrderStatus.PENDIENTE ? 'bg-yellow-100 text-yellow-800' :
                  caso?.status === OrderStatus.EN_PROGRESO ? 'bg-blue-100 text-blue-800' :
                    caso?.status === OrderStatus.COMPLETADO ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                  }`}>
                  {caso?.status}
                </span>
              </div>
              <div>
                <p className="text-gray-500">Fecha de Inicio</p>
                <p className="font-medium">{caso?.createdAt ? new Date(caso.createdAt).toLocaleDateString() : '-'}</p>
              </div>
            </div>

            {/* Nuevo botón para completar caso */}
            {caso?.status !== OrderStatus.COMPLETADO && caso?.status !== OrderStatus.CANCELADO && (
              <div className="pt-4 mt-6 border-t border-gray-100">
                <button
                  onClick={() => caso && openConfirmModal(caso.id)}
                  disabled={updateOrder.isPending}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex justify-center items-center shadow-sm disabled:opacity-50"
                >
                  {updateOrder.isPending ? 'Procesando...' : 'Marcar como Completado'}
                </button>
                <p className="text-xs text-gray-500 text-center mt-3 leading-tight">
                  Al completar el caso, el chat se cerrará permanentemente para ambas partes.
                </p>
              </div>
            )}
          </div>

          {/* Columna Derecha: Chat */}
          <div className="lg:col-span-2">
            <ChatWindow orderId={casoSeleccionado} />
          </div>
        </div>

        {/* Modal de confirmación */}
        <ConfirmModal
          isOpen={modalAbierto}
          onClose={() => setModalAbierto(false)}
          onConfirm={handleConfirmarCompletar}
          title="Completar Caso"
          message="¿Estás seguro de que deseas marcar este caso como completado? Esta acción es final y cerrará el chat de forma permanente."
          confirmText="Sí, Completar Caso"
          isLoading={updateOrder.isPending}
        />
      </div>
    );
  }

  // Vista de Tabla (Default)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Mis Casos</h2>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-500" />
          <div className="flex gap-2">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1 rounded-full text-sm ${filtroEstado === 'todos'
                ? 'bg-azul-primario text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroEstado(OrderStatus.PENDIENTE)}
              className={`px-3 py-1 rounded-full text-sm ${filtroEstado === OrderStatus.PENDIENTE
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFiltroEstado(OrderStatus.EN_PROGRESO)}
              className={`px-3 py-1 rounded-full text-sm ${filtroEstado === OrderStatus.EN_PROGRESO
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              En proceso
            </button>
            <button
              onClick={() => setFiltroEstado(OrderStatus.COMPLETADO)}
              className={`px-3 py-1 rounded-full text-sm ${filtroEstado === OrderStatus.COMPLETADO
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Completados
            </button>
          </div>
        </div>
      </div>

      {/* Tabla de casos */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Caso
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
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
            {casosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron casos asignados.
                </td>
              </tr>
            ) : (
              casosFiltrados.map((caso) => (
                <tr key={caso.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <div className="text-sm font-medium text-azul-primario">
                         {caso.items[0]?.serviceName || 'Servicio Legal'}
                       </div>
                       {unreadOrders.includes(caso.id) && (
                         <span className="flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                         </span>
                       )}
                    </div>
                    <div className="text-xs text-gray-500">ID: {caso.id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{caso.userName}</div>
                    <div className="text-xs text-gray-500">{caso.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {new Date(caso.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${caso.status === OrderStatus.PENDIENTE ? 'bg-yellow-100 text-yellow-800' :
                      caso.status === OrderStatus.EN_PROGRESO ? 'bg-blue-100 text-blue-800' :
                        caso.status === OrderStatus.COMPLETADO ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                      }`}>
                      {caso.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        className="text-azul-primario hover:text-azul-primario/80"
                        title="Ver detalles"
                        onClick={() => setCasoSeleccionado(caso.id)}
                      >
                        <FiEye />
                      </button>
                      <button
                        className={`hover:opacity-80 transition-all ${
                          unreadOrders.includes(caso.id) 
                          ? 'text-red-500 animate-pulse scale-110' 
                          : 'text-green-500 hover:text-green-600'
                        }`}
                        title={unreadOrders.includes(caso.id) ? "Responder Mensaje" : "Enviar mensaje"}
                        onClick={() => setCasoSeleccionado(caso.id)}
                      >
                        <FiMessageSquare />
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
  );
}

export default memo(CasosAbogadoPanel);