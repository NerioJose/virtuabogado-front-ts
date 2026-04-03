import { useState, useMemo, memo } from 'react';
import { FiBriefcase, FiEdit2, FiTrash2, FiUserCheck, FiStar, FiCheck, FiX, FiFilter, FiAward, FiMail, FiPhone, FiSearch } from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import { LawyerStatus } from '@/features/lawyers/types/lawyers.types';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { ElementoSeleccionable } from '@/types/index';
import { formatLawyerName } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

interface AbogadosPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: ElementoSeleccionable) => void;
}

function AbogadosPanel({ terminoBusqueda, abrirModal }: AbogadosPanelProps) {
  const { data: lawyers = [], isLoading } = useLawyers();
  const { data: ordersResponse } = useOrders();
  const orders = ordersResponse?.data || [];

  const [especialidadFilter, setEspecialidadFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LawyerStatus>('ALL');

  const especialidades = useMemo(() => {
    const specs = new Set<string>();
    lawyers.forEach(l => specs.add(l.especialidad));
    return Array.from(specs).sort();
  }, [lawyers]);

  const filteredLawyers = useMemo(() => {
    const term = terminoBusqueda.toLowerCase();
    return lawyers.filter(lawyer => {
      const matchesSearch =
        lawyer.nombre.toLowerCase().includes(term) ||
        lawyer.email.toLowerCase().includes(term) ||
        (lawyer.telefono && lawyer.telefono.includes(term));
      const matchesSpecialty = especialidadFilter === 'todas' || lawyer.especialidad === especialidadFilter;
      const matchesStatus = statusFilter === 'ALL' || lawyer.status === statusFilter;
      return matchesSearch && matchesSpecialty && matchesStatus;
    });
  }, [lawyers, terminoBusqueda, especialidadFilter, statusFilter]);

  const getActiveCases = (lawyerId: string) => {
    return orders.filter(o => o.lawyerId === lawyerId && o.status === OrderStatus.EN_PROGRESO).length;
  };

  const cambiarEstadoAbogado = (id: string, status: LawyerStatus) => {
    console.log('Implement change status', id, status);
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  if (isLoading && lawyers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filtros Modernos */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center bg-white/50 backdrop-blur-sm p-2 md:p-3 rounded-[1.5rem] border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200/40 shadow-inner">
          <FiFilter className="text-azul-primario" />
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Filtros Avanzados</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
          <select
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-azul-primario/5 text-sm font-bold text-slate-600 appearance-none shadow-sm transition-all"
            value={especialidadFilter}
            onChange={(e) => setEspecialidadFilter(e.target.value)}
          >
            <option value="todas">🎯 Todas las especialidades</option>
            {especialidades.map(esp => (
              <option key={esp} value={esp}>⚖️ {esp}</option>
            ))}
          </select>

          <select
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-azul-primario/5 text-sm font-bold text-slate-600 appearance-none shadow-sm transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">📋 Todos los estados</option>
            <option value={LawyerStatus.ACTIVE}>✅ Activos</option>
            <option value={LawyerStatus.PENDING}>⏳ Pendientes</option>
            <option value={LawyerStatus.INACTIVE}>🚫 Inactivos</option>
          </select>
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
          {filteredLawyers.map((lawyer) => {
            const casosEnProceso = getActiveCases(lawyer.id);
            return (
              <motion.div
                layout
                key={lawyer.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-[2rem] border border-slate-200/60 shadow-sm p-6 relative overflow-hidden"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-white">
                      <Image src={userImage} alt={lawyer.nombre} fill className="object-cover" />
                    </div>
                    <div>
                      <h3 className="font-black text-azul-primario leading-tight">{formatLawyerName(lawyer.nombre)}</h3>
                      <div className="flex items-center gap-1 text-amber-500 mt-1">
                        <FiStar className="fill-current w-3 h-3" />
                        <span className="text-xs font-black">{lawyer.rating || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    lawyer.status === LawyerStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' :
                    lawyer.status === LawyerStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                    'bg-slate-50 text-slate-500'
                  }`}>
                    {lawyer.status}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <FiAward className="text-azul-primario" />
                    <span className="text-xs font-bold uppercase tracking-tight">{lawyer.especialidad}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <FiMail className="text-azul-primario" />
                    <span className="text-xs font-medium truncate">{lawyer.email}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-tight ${
                    casosEnProceso >= 8 ? 'bg-rose-50 text-rose-600' :
                    casosEnProceso >= 4 ? 'bg-amber-50 text-amber-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    <FiBriefcase /> {casosEnProceso} CARGA
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal('editar', lawyer as any)} className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-azul-primario hover:text-white transition-all">
                      <FiEdit2 size={18} />
                    </button>
                    <button onClick={() => abrirModal('ver', lawyer as any)} className="p-2.5 bg-azul-primario/5 text-azul-primario rounded-xl hover:bg-azul-primario hover:text-white transition-all">
                      <FiUserCheck size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Vista Escritorio: Tabla Refinada con Scroll Lateral */}
      <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full lg:min-w-[1100px] divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cuerpo Legal</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Especialidad</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado Operativo</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nivel Carga</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ranking</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode='popLayout'>
                {filteredLawyers.map((lawyer) => {
                  const casosEnProceso = getActiveCases(lawyer.id);
                  return (
                    <motion.tr 
                      layout
                      key={lawyer.id} 
                      className="group hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative h-12 w-12 rounded-2xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                            <Image src={userImage} alt={lawyer.nombre} fill className="object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-azul-primario leading-tight">{formatLawyerName(lawyer.nombre)}</p>
                            <p className="text-xs text-slate-400 font-medium">{lawyer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-3 py-1 bg-azul-primario/5 text-azul-primario rounded-xl text-[10px] font-black uppercase tracking-tight">
                          {lawyer.especialidad}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          lawyer.status === LawyerStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' :
                          lawyer.status === LawyerStatus.PENDING ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {lawyer.status}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black tracking-tight ${
                          casosEnProceso >= 8 ? 'bg-rose-50 text-rose-600' :
                          casosEnProceso >= 4 ? 'bg-amber-50 text-amber-600' :
                          'bg-emerald-50 text-emerald-600'
                        }`}>
                          <FiBriefcase /> {casosEnProceso} {casosEnProceso === 1 ? 'CASO' : 'CASOS'}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5 text-amber-500">
                          <span className="text-sm font-black text-slate-700">{lawyer.rating || '--'}</span>
                          <FiStar className="fill-current w-4 h-4" />
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex justify-end gap-3 opacity-90 group-hover:opacity-100 transition-opacity">
                          <motion.button 
                            whileHover={{ scale: 1.1, y: -2 }} 
                            onClick={() => abrirModal('ver', lawyer as any)} 
                            className="p-2.5 bg-azul-primario text-white rounded-xl shadow-lg shadow-azul-primario/20 hover:bg-azul-primario/90 transition-all"
                            title="Ver Detalle"
                          >
                            <FiUserCheck size={18} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1, y: -2 }} 
                            onClick={() => abrirModal('editar', lawyer as any)} 
                            className="p-2.5 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
                            title="Editar Perfil"
                          >
                            <FiEdit2 size={18} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1, y: -2 }} 
                            onClick={() => abrirModal('eliminar', lawyer as any)} 
                            className="p-2.5 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all"
                            title="Eliminar"
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

      {filteredLawyers.length === 0 && (
        <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200/60 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiSearch className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-black text-azul-primario">Sin coincidencias</h3>
          <p className="text-slate-400 text-sm mt-1">Intenta con otros criterios de búsqueda.</p>
        </div>
      )}
    </div>
  );
}

export default memo(AbogadosPanel);