import { useMemo, memo, useState } from 'react';
import { FiEdit, FiTrash2, FiEye, FiFilter, FiUserPlus, FiMessageSquare, FiBriefcase, FiClock, FiCheckCircle, FiXCircle, FiDollarSign } from 'react-icons/fi';
import { ElementoSeleccionable } from '@/types/index';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useChatStore } from '@/features/chat/store/chatStore';
import { motion, AnimatePresence } from 'framer-motion';

interface CasosPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: ElementoSeleccionable) => void;
}

function CasosPanel({ terminoBusqueda, abrirModal }: CasosPanelProps) {
  const { data: response, isLoading } = useOrders({ limit: 100 });
  const orders = response?.data || [];
  const unreadOrders = useChatStore((state) => state.unreadOrders);

  const [filtroEstado, setFiltroEstado] = useState<'todos' | OrderStatus>('todos');

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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const statusConfig = {
    [OrderStatus.PENDIENTE]: { color: 'text-amber-600', bg: 'bg-amber-50', icon: <FiClock /> },
    [OrderStatus.EN_PROGRESO]: { color: 'text-blue-600', bg: 'bg-blue-50', icon: <FiBriefcase /> },
    [OrderStatus.COMPLETADO]: { color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <FiCheckCircle /> },
    [OrderStatus.CANCELADO]: { color: 'text-rose-600', bg: 'bg-rose-50', icon: <FiXCircle /> },
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filtros de Estado Premium */}
      <div className="bg-white/50 backdrop-blur-sm p-2 md:p-3 rounded-[2rem] border border-slate-200/60 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-inner mr-2">
            <FiFilter className="text-azul-primario" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</span>
          </div>
          
          <div className="flex gap-2">
            {[
              { id: 'todos', label: 'Todos', count: orders.length },
              { id: OrderStatus.PENDIENTE, label: 'Pendientes', count: orders.filter(o => o.status === OrderStatus.PENDIENTE).length },
              { id: OrderStatus.EN_PROGRESO, label: 'En Proceso', count: orders.filter(o => o.status === OrderStatus.EN_PROGRESO).length },
              { id: OrderStatus.COMPLETADO, label: 'Completados', count: orders.filter(o => o.status === OrderStatus.COMPLETADO).length },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFiltroEstado(btn.id as any)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  filtroEstado === btn.id
                    ? 'bg-azul-primario text-white shadow-lg shadow-azul-primario/20 scale-105'
                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
                }`}
              >
                {btn.label}
                <span className={`px-2 py-0.5 rounded-full text-[9px] ${
                  filtroEstado === btn.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {btn.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vista Móvil: Tarjetas de Expediente Premium */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden"
      >
        <AnimatePresence mode='popLayout'>
          {ordenesFiltradas.map((order) => {
            const config = (statusConfig as any)[order.status] || { color: 'text-slate-600', bg: 'bg-slate-50', icon: <FiClock /> };
            const isUnread = unreadOrders.includes(order.id);
            
            return (
              <motion.div
                layout
                key={order.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm p-6 relative overflow-hidden group"
              >
                {isUnread && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
                )}

                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-azul-primario tracking-tighter bg-azul-primario/5 px-2 py-1 rounded-lg">#{order.numericId}</span>
                      {isUnread && (
                        <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-bounce" />
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.color}`}>
                    {config.icon} {order.status}
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Titular</p>
                    <p className="text-sm font-black text-azul-primario truncate">{order.userName}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Causa Legal</p>
                    <p className="text-sm font-bold text-slate-600 truncate">{order.items.map(item => item.serviceName).join(', ')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                  <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asignación</p>
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-tight ${
                      order.lawyerId ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600 animate-pulse'
                    }`}>
                      {order.lawyerName || 'POR ASIGNAR'}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Honorarios</p>
                    <p className="text-xl font-black text-azul-primario tracking-tighter">${order.total.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-2">
                  <button onClick={() => abrirModal('ver', order as any)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                    isUnread ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-azul-primario text-white shadow-lg shadow-azul-primario/20'
                  }`}>
                    {isUnread ? <FiMessageSquare /> : <FiEye />} {isUnread ? 'NUEVO MENSAJE' : 'EXPEDIENTE'}
                  </button>
                  <button onClick={() => abrirModal('asignar', order as any)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                    <FiUserPlus size={18} />
                  </button>
                  <button onClick={() => abrirModal('editar', order as any)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-amber-500 hover:text-white transition-all shadow-sm">
                    <FiEdit size={18} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Vista Escritorio: Tabla Operativa Premium */}
      <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50/50">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Causa #</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Titular</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Servicio Jurídico</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cuerpo Legal</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Honorarios</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <AnimatePresence mode='popLayout'>
              {ordenesFiltradas.map((order) => {
                const config = (statusConfig as any)[order.status] || { color: 'text-slate-600', bg: 'bg-slate-50', icon: <FiClock /> };
                const isUnread = unreadOrders.includes(order.id);
                
                return (
                  <motion.tr 
                    layout
                    key={order.id} 
                    className="group hover:bg-slate-50/30 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-azul-primario bg-azul-primario/5 px-3 py-1 rounded-xl">#{order.numericId}</span>
                        {isUnread && (
                          <div className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-slate-700">{order.userName}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{order.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs font-bold text-slate-600 truncate max-w-[200px]">
                        {order.items.map(item => item.serviceName).join(', ')}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-xl text-[10px] font-black tracking-tight ${
                        order.lawyerId ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                      }`}>
                        {order.lawyerName || 'POR ASIGNAR'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-slate-700 tracking-tight">
                        ${order.total.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`flex items-center gap-1.5 w-fit px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.color}`}>
                        {config.icon} {order.status}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button whileHover={{ scale: 1.1, y: -2 }} onClick={() => abrirModal('asignar', order as any)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                          <FiUserPlus size={18} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1, y: -2 }} onClick={() => abrirModal('ver', order as any)} className={`p-2 rounded-lg transition-all ${isUnread ? 'bg-rose-500 text-white animate-pulse' : 'bg-azul-primario/5 text-azul-primario'}`}>
                          {isUnread ? <FiMessageSquare size={18} /> : <FiEye size={18} />}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1, y: -2 }} onClick={() => abrirModal('editar', order as any)} className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                          <FiEdit size={18} />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1, y: -2 }} onClick={() => abrirModal('eliminar', order as any)} className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                          <FiTrash2 size={18} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {ordenesFiltradas.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-200/60 shadow-sm">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiBriefcase className="text-slate-300" size={40} />
          </div>
          <h3 className="text-xl font-black text-azul-primario uppercase tracking-tight">Sin causas registradas</h3>
          <p className="text-slate-400 text-sm mt-1">No se encontraron casos bajo los criterios actuales.</p>
        </div>
      )}
    </div>
  );
}

export default memo(CasosPanel);