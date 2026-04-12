'use client';

import { useState, useMemo } from 'react';
import { FiCalendar, FiClock, FiUser, FiChevronLeft, FiChevronRight, FiBriefcase, FiArrowRight } from 'react-icons/fi';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgendaPanel } from './hooks/useAgendaPanel';

interface AgendaPanelProps {
  abogadoId: string;
  onVerDetalles?: (casoId: string) => void;
}

export default function AgendaPanel({ abogadoId, onVerDetalles }: AgendaPanelProps) {
  const {
    fechaSeleccionada,
    casosDelDia,
    isLoading,
    cambiarDia,
  } = useAgendaPanel(abogadoId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full shadow-lg shadow-azul-primario/25"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Cabecera de Agenda */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-azul-primario/10 rounded-2xl flex items-center justify-center text-azul-primario">
                <FiCalendar size={28} />
             </div>
             <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cronograma de Trabajo</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión diaria de expedientes</p>
             </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-[2rem] border border-slate-100 self-center md:self-auto">
             <button
               onClick={() => cambiarDia(-1)}
               className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-azul-primario hover:shadow-md transition-all active:scale-90"
             >
               <FiChevronLeft size={20} />
             </button>

             <div className="text-center px-4 min-w-[180px]">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                  {fechaSeleccionada.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', year: 'numeric' })}
                </h3>
                <p className="text-[9px] font-black text-azul-primario uppercase tracking-[0.2em] mt-0.5">
                  {fechaSeleccionada.toLocaleDateString('es-ES', { weekday: 'long' })}
                </p>
             </div>

             <button
               onClick={() => cambiarDia(1)}
               className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-azul-primario hover:shadow-md transition-all active:scale-90"
             >
               <FiChevronRight size={20} />
             </button>
          </div>
        </div>
      </div>

      {/* Cuerpo de Agenda */}
      <div className="max-w-3xl mx-auto">
        {casosDelDia.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 px-8 bg-white rounded-[3rem] border border-slate-100 border-dashed"
          >
            <div className="mx-auto w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300">
              <FiCalendar size={36} />
            </div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Día sin Actividad</h3>
            <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto font-medium">
              No hay nuevos casos iniciados ni hitos programados para esta fecha en tu expediente.
            </p>
          </motion.div>
        ) : (
          <div className="relative pl-12 md:pl-20 border-l-2 border-slate-100 space-y-6">
            <AnimatePresence mode="popLayout">
              {casosDelDia.map((caso: any, idx: number) => (
                <motion.div 
                  key={caso.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative"
                >
                  {/* Punto en la línea de tiempo */}
                  <div className="absolute -left-[13px] md:-left-[21px] top-8 w-6 h-6 bg-white border-4 border-azul-primario rounded-full shadow-lg shadow-azul-primario/25 z-10" />

                  <div className="group bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-azul-primario/20 transition-all cursor-default">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="shrink-0 flex items-center justify-center w-16 h-16 bg-azul-primario/5 rounded-2xl text-azul-primario group-hover:bg-azul-primario group-hover:text-white transition-all duration-500">
                        <FiBriefcase size={28} />
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                           <div>
                              <span className="text-[10px] font-black text-azul-primario uppercase tracking-widest">Servicio Iniciado</span>
                              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-tight mt-1">
                                {caso.items?.[0]?.serviceName || 'Solicitud de Asesoría Legal'}
                              </h3>
                           </div>
                           <div className="flex items-center gap-2">
                             <div className="bg-slate-50 text-slate-400 text-[10px] px-3 py-1.5 rounded-xl font-black tracking-tighter uppercase font-mono">
                                ID: {caso.numericId || caso.id.slice(0, 4)}
                             </div>
                             <span className={`w-3 h-3 rounded-full animate-pulse ${caso.status === 'COMPLETADO' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                             <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-azul-primario shadow-sm">
                               <FiUser size={14} />
                             </div>
                             <div>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                               <p className="text-xs font-black text-slate-700">{caso.userName}</p>
                             </div>
                          </div>

                          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
                             <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-azul-primario shadow-sm">
                               <FiClock size={14} />
                             </div>
                             <div>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hora de Registro</p>
                               <p className="text-xs font-black text-slate-700 italic">
                                 {new Date(caso.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} HS
                               </p>
                             </div>
                          </div>
                        </div>
                        
                        <div className="pt-6 border-t border-slate-50 flex justify-between items-center sm:items-center">
                           <span className={`text-[10px] font-black px-4 py-1.5 rounded-xl uppercase tracking-[0.15em] border ${
                            caso.status === 'COMPLETADO' 
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                              : 'bg-amber-50 border-amber-100 text-amber-600'
                           }`}>
                            {caso.status}
                           </span>
                           
                           <button 
                             onClick={() => onVerDetalles?.(caso.id)}
                             className="group/btn flex items-center gap-2 text-xs font-black text-azul-primario uppercase tracking-widest hover:gap-3 transition-all active:scale-95"
                           >
                             Expediente Digital
                             <FiArrowRight />
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}