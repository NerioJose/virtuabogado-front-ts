'use client';

import { useMemo, memo } from 'react';
import { FiUsers, FiSearch, FiEdit, FiTrash2, FiEye, FiMail, FiPhone, FiFilter, FiCalendar, FiShoppingBag, FiDollarSign } from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../../public/images/user-placeholder.png';
import { ClientStatus } from '@/features/clients/types/clients.types';
import { useClientesPanel } from '../hooks/useClientesPanel';
import { ElementoSeleccionable } from '@/types/index';
import { capitalizeName } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

interface ClientesPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: ElementoSeleccionable) => void;
}

function ClientesPanel({ terminoBusqueda, abrirModal }: ClientesPanelProps) {
  const {
      clientesFiltrados,
      filtroActividad,
      setFiltroActividad,
      getClientOrders,
      isLoading,
  } = useClientesPanel(terminoBusqueda);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filtros de Actividad Premium */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white/50 backdrop-blur-sm p-3 rounded-[1.8rem] border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200/40 shadow-inner">
          <FiFilter className="text-azul-primario" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Segmentación</span>
        </div>

        <div className="flex flex-wrap gap-2 flex-1">
          {[
            { id: 'todos', label: 'Todos', color: 'bg-azul-primario' },
            { id: 'reciente', label: 'Recientes', color: 'bg-emerald-500' },
            { id: 'inactivo', label: 'Históricos', color: 'bg-slate-500' }
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFiltroActividad(btn.id as any)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                filtroActividad === btn.id
                  ? `${btn.color} text-white shadow-lg scale-105`
                  : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vista Móvil: Tarjetas Premium */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:hidden"
      >
        <AnimatePresence mode='popLayout'>
          {clientesFiltrados.map((cliente) => {
            const clientOrders = getClientOrders(cliente.id);
            return (
              <motion.div
                layout
                key={cliente.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2.2rem] border border-slate-100 shadow-sm p-6 relative group overflow-hidden"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-inner border border-slate-100">
                      <Image src={userImage} alt={cliente.nombre} fill sizes="200px" className="object-cover" />
                    </div>
                    <div>
                      <h3 className="font-black text-azul-primario leading-tight">{capitalizeName(cliente.nombre)}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">ID: {cliente.id.slice(-6)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                    cliente.status === ClientStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' :
                    cliente.status === ClientStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {cliente.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase mb-1">
                      <FiShoppingBag className="text-azul-primario" /> Servicios
                    </div>
                    <p className="text-sm font-black text-azul-primario">{cliente.serviciosContratados} Unidades</p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase mb-1">
                      <FiDollarSign className="text-emerald-500" /> Inversión
                    </div>
                    <p className="text-sm font-black text-emerald-600">${cliente.totalGastado.toLocaleString()}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                  <div className="flex gap-2">
                    <a href={`mailto:${cliente.email}`} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-azul-primario hover:text-white transition-all shadow-sm">
                      <FiMail size={16} />
                    </a>
                    {cliente.telefono && (
                      <a href={`tel:${cliente.telefono}`} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                        <FiPhone size={16} />
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal('ver', cliente as any)} className="p-2.5 bg-azul-primario/5 text-azul-primario rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-azul-primario hover:text-white transition-all">
                      <FiEye size={16} />
                    </button>
                    <button onClick={() => abrirModal('editar', cliente as any)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-azul-primario hover:text-white transition-all">
                      <FiEdit size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      <div className="hidden lg:block bg-white rounded-[2.2rem] shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="table-container p-1">
          <table className="min-w-[1100px] divide-y divide-slate-100 text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Expediente Cliente</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Comunicación</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Antigüedad</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actividad</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inversión Total</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode='popLayout'>
                {clientesFiltrados.map((cliente) => {
                  const clientOrders = getClientOrders(cliente.id);
                  return (
                    <motion.tr 
                      layout
                      key={cliente.id} 
                      className="group hover:bg-slate-50/30 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative h-11 w-11 rounded-2xl overflow-hidden shadow-inner border border-slate-100">
                            <Image src={userImage} alt={cliente.nombre} fill sizes="200px" className="object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-azul-primario leading-tight">{capitalizeName(cliente.nombre)}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {cliente.id.slice(-8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-slate-500 font-medium">
                            <FiMail className="mr-2 text-azul-primario" /> {cliente.email}
                          </div>
                          {cliente.telefono && (
                            <div className="flex items-center text-xs text-slate-500 font-medium">
                              <FiPhone className="mr-2 text-emerald-500" /> {cliente.telefono}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2 text-slate-500">
                          <FiCalendar className="text-azul-primario" />
                          <span className="text-xs font-bold">{new Date(cliente.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-azul-primario capitalize">{cliente.serviciosContratados} Servicios</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{clientOrders.length} Órdenes totales</p>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm font-black text-emerald-600 tracking-tight">
                          ${cliente.totalGastado.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          cliente.status === ClientStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' :
                          cliente.status === ClientStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {cliente.status}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-3 opacity-90 group-hover:opacity-100 transition-opacity">
                          <motion.button 
                            whileHover={{ scale: 1.1, y: -2 }} 
                            onClick={() => abrirModal('ver', cliente as any)} 
                            className="p-2.5 bg-azul-primario text-white rounded-xl shadow-lg shadow-azul-primario/20 hover:bg-azul-primario/90 transition-all font-black"
                            title="Ver Expediente"
                          >
                            <FiEye size={18} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1, y: -2 }} 
                            onClick={() => abrirModal('editar', cliente as any)} 
                            className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all font-black"
                            title="Editar Perfil"
                          >
                            <FiEdit size={18} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1, y: -2 }} 
                            onClick={() => abrirModal('eliminar', cliente as any)} 
                            className="p-2.5 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all font-black"
                            title="Eliminar Cliente"
                          >
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
      </div>

      {clientesFiltrados.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiSearch className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-black text-azul-primario">Sin resultados</h3>
          <p className="text-slate-400 text-sm mt-1">Ajusta los filtros o el término de búsqueda.</p>
        </div>
      )}
    </div>
  );
}

export default memo(ClientesPanel);