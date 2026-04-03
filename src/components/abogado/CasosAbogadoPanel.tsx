import { useState, useEffect, memo, useMemo } from 'react';
import { FiEye, FiMessageSquare, FiFileText, FiFilter, FiArrowLeft, FiBriefcase } from 'react-icons/fi';
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-azul-primario/10 rounded-lg flex items-center justify-center text-azul-primario">
            <FiBriefcase size={18} />
          </div>
          Mis Casos
        </h2>

        {/* Filtros Adaptativos */}
        <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
              <FiFilter size={16} />
            </div>
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'todos', label: 'Todos', color: 'bg-azul-primario' },
                { id: OrderStatus.PENDIENTE, label: 'Pendientes', color: 'bg-amber-500' },
                { id: OrderStatus.EN_PROGRESO, label: 'En proceso', color: 'bg-blue-500' },
                { id: OrderStatus.REVISION, label: 'Revisión', color: 'bg-purple-500' },
                { id: OrderStatus.COMPLETADO, label: 'Completados', color: 'bg-emerald-500' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFiltroEstado(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${filtroEstado === f.id
                    ? `${f.color} text-white shadow-sm`
                    : 'text-slate-500 hover:bg-white hover:text-slate-700'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* VISTA MÓVIL (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden pb-10">
        {casosFiltrados.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
             <p className="text-slate-400 font-bold">No hay casos que coincidan</p>
          </div>
        ) : (
          casosFiltrados.map((caso) => (
            <motion.div 
              key={caso.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => setCasoSeleccionado(caso.id)}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all relative overflow-hidden"
            >
              {unreadOrders.includes(caso.id) && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-bl-xl shadow-sm animate-pulse" />
              )}
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-black text-slate-800 text-sm leading-tight mb-1">
                    {caso.items[0]?.serviceName || 'Servicio Legal'}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {caso.id.slice(0, 8)}</p>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-tighter shadow-sm ${
                  caso.status === OrderStatus.PENDIENTE ? 'bg-amber-100 text-amber-700' :
                  caso.status === OrderStatus.EN_PROGRESO ? 'bg-blue-100 text-blue-700' :
                  caso.status === OrderStatus.COMPLETADO ? 'bg-emerald-100 text-emerald-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {caso.status}
                </span>
              </div>

              <div className="flex items-center justify-between mt-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs">
                    {caso.userName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-700">{caso.userName}</p>
                    <p className="text-[10px] font-bold text-slate-400 italic">Iniciado el {new Date(caso.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                   <div className={`p-2 rounded-xl bg-slate-50 text-slate-400 ${unreadOrders.includes(caso.id) ? 'text-red-500' : ''}`}>
                      <FiMessageSquare size={16} />
                   </div>
                   <div className="p-2 rounded-xl bg-azul-primario text-white shadow-md shadow-azul-primario/25">
                      <FiEye size={16} />
                   </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* VISTA DESKTOP (Tabla) */}
      <div className="hidden md:block overflow-hidden rounded-3xl border border-slate-100 shadow-sm bg-white">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Caso</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
              <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {casosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold italic">
                  No se encontraron casos asignados.
                </td>
              </tr>
            ) : (
              casosFiltrados.map((caso) => (
                <tr key={caso.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-azul-primario/5 rounded-xl flex items-center justify-center text-azul-primario group-hover:bg-azul-primario group-hover:text-white transition-all duration-300">
                          <FiBriefcase size={18} />
                       </div>
                       <div>
                          <div className="text-sm font-black text-slate-800">
                            {caso.items[0]?.serviceName || 'Servicio Legal'}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter italic">ID: {caso.id.slice(0, 8)}...</div>
                       </div>
                       {unreadOrders.includes(caso.id) && (
                         <span className="flex h-2 w-2">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                         </span>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-black text-slate-700">{caso.userName}</div>
                    <div className="text-xs font-bold text-slate-400 italic">{caso.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-black text-slate-700">
                      {new Date(caso.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-tighter shadow-sm ${
                      caso.status === OrderStatus.PENDIENTE ? 'bg-amber-100 text-amber-700' :
                      caso.status === OrderStatus.EN_PROGRESO ? 'bg-blue-100 text-blue-700' :
                      caso.status === OrderStatus.COMPLETADO ? 'bg-emerald-100 text-emerald-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {caso.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end space-x-2">
                      <button
                        className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-azul-primario hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm"
                        title="Ver detalles"
                        onClick={() => setCasoSeleccionado(caso.id)}
                      >
                        <FiEye size={18} />
                      </button>
                      <button
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                          unreadOrders.includes(caso.id) 
                          ? 'bg-red-50 text-red-500 animate-pulse' 
                          : 'bg-slate-50 text-slate-400 hover:bg-green-500 hover:text-white'
                        }`}
                        title={unreadOrders.includes(caso.id) ? "Responder Mensaje" : "Enviar mensaje"}
                        onClick={() => setCasoSeleccionado(caso.id)}
                      >
                        <FiMessageSquare size={18} />
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