'use client';

import { useState, useEffect, memo, useMemo } from 'react';
import { FiEye, FiMessageSquare, FiFileText, FiFilter, FiArrowLeft, FiBriefcase, FiCheckCircle } from 'react-icons/fi';
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

  useEffect(() => {
    if (!isLoading) {
      // console.log(`[LawyerDashboard] Casos encontrados en frontend: ${misCasos.length}`);
    }
  }, [misCasos.length, isLoading]);

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

  // Filtrar y ordenar casos (Nuevos primero)
  const casosFiltrados = useMemo(() => {
    return misCasos
      .filter(caso => {
        const matchEstado = filtroEstado === 'todos' || caso.status === filtroEstado;
        const matchCliente = initialClienteId ? caso.userId === initialClienteId : true;
        return matchEstado && matchCliente;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
          <div className="flex items-center gap-2 w-full">
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

      {/* VISTA MÓVIL: CARDS PREMIUM */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {casosFiltrados.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4 border border-slate-100">
              <FiBriefcase size={32} />
            </div>
            <p className="text-slate-900 font-black text-lg mb-2">No tienes casos asignados actualmente</p>
            <p className="text-slate-400 font-bold text-sm">Tan pronto como se te asigne un nuevo caso, aparecerá en esta sección.</p>
          </div>
        ) : (
          casosFiltrados.map((caso) => (
            <div key={caso.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] relative overflow-hidden group">
              {/* Status Badge - Top Right */}
              <div className="absolute top-5 right-5">
                <span className={`px-3 py-1.5 text-[9px] font-black rounded-xl uppercase tracking-tighter shadow-sm border ${
                  caso.status === OrderStatus.PENDIENTE ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  caso.status === OrderStatus.EN_PROGRESO ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  caso.status === OrderStatus.COMPLETADO ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  <div className="flex items-center gap-1.5">
                    {caso.status === OrderStatus.COMPLETADO && <FiCheckCircle size={12} />}
                    {caso.status}
                  </div>
                </span>
              </div>

              {/* Header: Icon + Info */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-azul-primario/5 rounded-2xl flex items-center justify-center text-azul-primario shadow-inner">
                  <FiBriefcase size={22} />
                </div>
                <div className="pr-20">
                  <h3 className="text-sm font-black text-slate-800 leading-tight mb-1">
                    {caso.items[0]?.serviceName || 'Servicio Legal'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {caso.id.slice(0, 8)}</p>
                </div>
              </div>

              {/* Body: Client & Date */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500">
                    {caso.userName?.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs font-bold text-slate-600 truncate">{caso.userName}</span>
                </div>
                <div className="flex flex-col items-end justify-center">
                  <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Fecha Inicio</span>
                  <span className="text-xs font-black text-slate-500">
                    {new Date(caso.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  className="flex-1 h-11 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-azul-primario hover:text-white transition-all"
                  onClick={() => setCasoSeleccionado(caso.id)}
                >
                  <FiEye size={16} /> Ver Detalles
                </button>
                <button
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                    unreadOrders.includes(caso.id) 
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                    : 'bg-slate-50 text-slate-400 hover:bg-azul-primario hover:text-white'
                  }`}
                  onClick={() => setCasoSeleccionado(caso.id)}
                >
                  <FiMessageSquare size={18} />
                </button>
              </div>

              {/* Notification Dot */}
              {unreadOrders.includes(caso.id) && (
                <div className="absolute top-2 left-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* VISTA DESKTOP: TABLA ELEGANTE */}
      <div className="hidden md:block bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar-horizontal">
          <table className="w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Caso / ID</th>
                <th scope="col" className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                <th scope="col" className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha Inicio</th>
                <th scope="col" className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th scope="col" className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {casosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-4 border border-slate-100">
                        <FiBriefcase size={32} />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">No tienes casos asignados actualmente</h3>
                      <p className="text-slate-400 font-bold max-w-sm mx-auto">
                        Tu panel de gestión está listo. Tan pronto como recibas una nueva asignación validada como PAGADA, la verás aquí.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                casosFiltrados.map((caso) => (
                  <tr key={caso.id} className={`hover:bg-slate-50/80 transition-colors group ${caso.status === OrderStatus.COMPLETADO ? 'opacity-60 grayscale-[0.2]' : ''}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                         <div className="w-11 h-11 bg-azul-primario/5 rounded-2xl flex items-center justify-center text-azul-primario group-hover:bg-azul-primario group-hover:text-white transition-all duration-300 shadow-sm">
                            <FiBriefcase size={20} />
                         </div>
                         <div>
                            <div className="text-sm font-black text-slate-800 tracking-tight">
                              {caso.items[0]?.serviceName || 'Servicio Legal'}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {caso.id.slice(0, 8)}</div>
                         </div>
                         {unreadOrders.includes(caso.id) && (
                           <div className="relative flex h-2 w-2">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                           </div>
                         )}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200">
                             {caso.userName?.charAt(0) || 'U'}
                         </div>
                         <div>
                            <div className="text-sm font-black text-slate-700 leading-none">{caso.userName}</div>
                            <div className="text-[10px] font-bold text-slate-400 mt-1">{caso.userEmail}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-black text-slate-600">
                        {new Date(caso.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-[10px] font-black rounded-xl uppercase tracking-tighter shadow-sm border ${
                        caso.status === OrderStatus.PENDIENTE ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        caso.status === OrderStatus.EN_PROGRESO ? 'bg-blue-50 text-blue-600 border-blue-100' :
                         caso.status === OrderStatus.COMPLETADO ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                        <div className="flex items-center gap-1.5">
                          {caso.status === OrderStatus.COMPLETADO && <FiCheckCircle size={12} />}
                          {caso.status}
                        </div>
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2.5">
                        <button
                          className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-azul-primario hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm"
                          title="Ver detalles"
                          onClick={() => setCasoSeleccionado(caso.id)}
                        >
                          <FiEye size={18} />
                        </button>
                        <button
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
                            unreadOrders.includes(caso.id) 
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-slate-50 text-slate-400 hover:bg-azul-primario hover:text-white'
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
    </div>
  );
}

export default memo(CasosAbogadoPanel);