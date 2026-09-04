'use client';

import { memo } from 'react';
import { FiEye, FiMessageSquare, FiFileText, FiFilter, FiArrowLeft, FiBriefcase, FiCheckCircle } from 'react-icons/fi';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
import { motion } from 'framer-motion';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { formatOrderId } from '@/lib/formatOrderId';
import { useCasosAbogadoPanel } from './hooks/useCasosAbogadoPanel';

interface CasosAbogadoPanelProps {
  abogadoId: string;
  initialClienteId?: string | null;
  initialCasoId?: string | null;
}

function CasosAbogadoPanel({ abogadoId, initialClienteId, initialCasoId }: CasosAbogadoPanelProps) {
  const {
      misCasos,
      casosFiltrados,
      isLoading,
      unreadOrders,
      unreadCounts,
      filtroEstado,
      setFiltroEstado,
      casoSeleccionado,
      setCasoSeleccionado,
      modalAbierto,
      setModalAbierto,
      openConfirmModal,
      handleConfirmarCompletar,
      isUpdating,
  } = useCasosAbogadoPanel(abogadoId, initialClienteId, initialCasoId);

  if (isLoading && misCasos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Vista de Chat/Detalle
  if (casoSeleccionado) {
    const caso = misCasos.find((c: any) => c.id === casoSeleccionado);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button type="button"
            onClick={() => setCasoSeleccionado(null)}
            className="flex items-center text-gray-600 hover:text-azul-primario transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Volver a mis casos
          </button>
          <h2 className="text-xl font-bold text-gray-800">
            {caso ? `#${formatOrderId(caso.numericId, caso.createdAt)} - ${caso.items?.[0]?.serviceName || 'Caso'}` : 'Chat'}
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
                <button type="button"
                  onClick={() => caso && openConfirmModal(caso.id)}
                  disabled={isUpdating}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex justify-center items-center shadow-sm disabled:opacity-50"
                >
                  {isUpdating ? 'Procesando...' : 'Marcar como Completado'}
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
          isLoading={isUpdating}
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
                <button type="button"
                  key={f.id}
                  onClick={() => setFiltroEstado(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition ${filtroEstado === f.id
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
          casosFiltrados.map((caso: any) => (
            <div key={caso.id} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm hover:shadow-md transition active:scale-[0.98] relative overflow-hidden group">
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
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">#{formatOrderId(caso.numericId, caso.createdAt)}</p>
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
                <button type="button"
                  className="flex-1 h-11 rounded-2xl bg-slate-50 text-slate-500 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-azul-primario hover:text-white transition"
                  onClick={() => setCasoSeleccionado(caso.id)}
                >
                  <FiEye size={16} /> Ver Detalles
                </button>
                <button type="button"
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition relative ${
                    (unreadCounts[caso.id] || 0) > 0
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200' 
                    : 'bg-slate-50 text-slate-400 hover:bg-azul-primario hover:text-white'
                  }`}
                  onClick={() => setCasoSeleccionado(caso.id)}
                >
                  {(unreadCounts[caso.id] || 0) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 bg-white text-red-500 text-[8px] font-black rounded-full flex items-center justify-center leading-none shadow-sm border border-red-200">
                      {unreadCounts[caso.id] > 99 ? '99+' : unreadCounts[caso.id]}
                    </span>
                  )}
                  <FiMessageSquare size={18} />
                </button>
              </div>

              {/* Notification Badge */}
              {(unreadCounts[caso.id] || 0) > 0 && (
                <div className="absolute top-2 left-2">
                  <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none shadow-sm shadow-red-500/40 ring-2 ring-white">
                    {unreadCounts[caso.id] > 99 ? '99+' : unreadCounts[caso.id]}
                  </span>
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
                casosFiltrados.map((caso: any) => (
                  <tr key={caso.id} className={`hover:bg-slate-50/80 transition-colors group ${caso.status === OrderStatus.COMPLETADO ? 'opacity-60 grayscale-[0.2]' : ''}`}>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                         <div className="w-11 h-11 bg-azul-primario/5 rounded-2xl flex items-center justify-center text-azul-primario group-hover:bg-azul-primario group-hover:text-white transition duration-300 shadow-sm">
                            <FiBriefcase size={20} />
                         </div>
                         <div>
                            <div className="text-sm font-black text-slate-800 tracking-tight">
                              {caso.items[0]?.serviceName || 'Servicio Legal'}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">#{formatOrderId(caso.numericId, caso.createdAt)}</div>
                         </div>
                         {(unreadCounts[caso.id] || 0) > 0 && (
                           <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none shadow-sm shadow-red-500/40 ring-2 ring-white">
                             {unreadCounts[caso.id] > 99 ? '99+' : unreadCounts[caso.id]}
                           </span>
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
                        <button type="button"
                          className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:bg-azul-primario hover:text-white transition duration-300 flex items-center justify-center shadow-sm"
                          title="Ver detalles"
                          onClick={() => setCasoSeleccionado(caso.id)}
                        >
                          <FiEye size={18} />
                        </button>
                        <button type="button"
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition duration-300 shadow-sm relative ${
                            (unreadCounts[caso.id] || 0) > 0
                            ? 'bg-red-500 text-white animate-pulse' 
                            : 'bg-slate-50 text-slate-400 hover:bg-azul-primario hover:text-white'
                          }`}
                          title={(unreadCounts[caso.id] || 0) > 0 ? "Responder Mensaje" : "Enviar mensaje"}
                          onClick={() => setCasoSeleccionado(caso.id)}
                        >
                          {(unreadCounts[caso.id] || 0) > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-white text-red-500 text-[7px] font-black rounded-full flex items-center justify-center leading-none shadow-sm border border-red-200">
                              {unreadCounts[caso.id] > 99 ? '99+' : unreadCounts[caso.id]}
                            </span>
                          )}
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