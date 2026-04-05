'use client';

import { motion } from 'framer-motion';
import { 
  FiBriefcase, 
  FiClock, 
  FiCheckCircle, 
  FiXCircle, 
  FiActivity 
} from 'react-icons/fi';

interface ClientStatsProps {
  stats: {
    total: number;
    pendientes: number;
    programados: number;
    completados: number;
    cancelados: number;
  };
  isLoading?: boolean;
}

export default function ClientStats({ stats, isLoading }: ClientStatsProps) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const cards = [
    { label: 'Servicios Totales', value: stats.total, icon: <FiBriefcase />, color: 'text-azul-primario', bg: 'bg-azul-primario/5' },
    { label: 'En Proceso', value: stats.programados, icon: <FiActivity />, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pendientes', value: stats.pendientes, icon: <FiClock />, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completados', value: stats.completados, icon: <FiCheckCircle />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-4 md:gap-6 mb-10 px-1"
    >
      {cards.map((card, idx) => (
        <motion.div
          key={idx}
          variants={item}
          className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-xl hover:shadow-azul-primario/5 transition-all"
        >
          <div className={`absolute top-0 right-0 w-24 h-24 ${card.bg} rounded-full blur-3xl -mr-8 -mt-8 opacity-50 group-hover:scale-150 transition-transform duration-700`} />
          
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className={`w-12 h-12 rounded-2xl ${card.bg} flex items-center justify-center ${card.color} shadow-inner`}>
              {card.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{card.label}</p>
          </div>
          
          <div className="relative z-10">
            {isLoading ? (
              <div className="h-10 bg-slate-100 animate-pulse rounded-xl w-1/2" />
            ) : (
              <h3 className={`text-4xl font-black tracking-tighter ${card.color}`}>
                {card.value}
              </h3>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
