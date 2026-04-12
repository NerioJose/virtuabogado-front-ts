'use client';

import { useState, useMemo } from 'react';
import { FiUser, FiMail, FiPhone, FiFileText, FiMessageSquare, FiSearch, FiFilter } from 'react-icons/fi';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';
import { OrderStatus } from '@/features/orders/types/orders.types';

import { useClientesAbogadoPanel, ClienteRecord } from './hooks/useClientesAbogadoPanel';

interface ClientesAbogadoPanelProps {
  abogadoId: string;
  onNavigateToCasos?: (clienteId: string) => void;
  onNavigateToMensajes?: (clienteId: string) => void;
}

export default function ClientesAbogadoPanel({ abogadoId, onNavigateToCasos, onNavigateToMensajes }: ClientesAbogadoPanelProps) {
  const {
    clientesFiltrados,
    isLoading,
    busqueda,
    setBusqueda,
    filtroActividad,
    setFiltroActividad,
    esClienteReciente,
  } = useClientesAbogadoPanel(abogadoId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 bg-azul-primario/10 rounded-lg flex items-center justify-center text-azul-primario">
                <FiUser size={18} />
            </div>
            Base de Clientes
        </h2>
        
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
            Total: {clientesFiltrados.length} Registros
        </p>
      </div>

      {/* Buscador y Filtros Adaptativos */}
      <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-11 pr-4 py-3 w-full bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-azul-primario text-sm font-medium placeholder:text-slate-400"
          />
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Estado:</span>
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'todos', label: 'Todos', color: 'bg-azul-primario' },
              { id: 'reciente', label: 'Recientes', color: 'bg-emerald-500' },
              { id: 'inactivo', label: 'Inactivos', color: 'bg-slate-500' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroActividad(f.id as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${filtroActividad === f.id
                  ? `${f.color} text-white shadow-md`
                  : 'bg-white text-slate-500 hover:text-azul-primario'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-10">
        {clientesFiltrados.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <div className="mx-auto w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
              <FiUser size={40} />
            </div>
            <h3 className="text-slate-800 font-black text-lg mb-2">Sin coincidencias</h3>
            <p className="text-slate-400 text-sm font-medium">Ajusta los filtros o el término de búsqueda</p>
          </div>
        ) : (
          clientesFiltrados.map((cliente) => (
            <div key={cliente.id} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 group overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border-2 border-slate-100 group-hover:border-azul-primario transition-colors">
                        <Image
                        src={cliente.imagen || userImage}
                        alt={cliente.nombre}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                    {esClienteReciente(cliente.ultimaActividad) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-800 truncate mb-0.5 tracking-tight">{cliente.nombre}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Desde {new Date(cliente.fechaAsignacion).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <a href={`mailto:${cliente.email}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-azul-primario/5 transition-colors group/link">
                    <FiMail className="text-slate-400 group-hover/link:text-azul-primario" />
                    <span className="text-xs font-bold text-slate-600 truncate">{cliente.email}</span>
                  </a>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <FiPhone className="text-slate-400" />
                    <span className="text-xs font-bold text-slate-600 italic">No disponible</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="p-3 bg-azul-primario/[0.03] rounded-2xl border border-azul-primario/5 text-center">
                        <span className="block text-lg font-black text-azul-primario leading-none">{cliente.casosActivos}</span>
                        <span className="text-[9px] font-black text-azul-primario/60 uppercase tracking-tighter">Activos</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                        <span className="block text-lg font-black text-emerald-600 leading-none">{cliente.casosCompletados}</span>
                        <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-tighter">Historial</span>
                    </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => onNavigateToCasos?.(cliente.id)}
                    className="flex-1 h-12 flex items-center justify-center gap-2 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-azul-primario hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    <FiFileText size={14} />
                    Ver Casos
                  </button>
                  <button 
                    onClick={() => onNavigateToMensajes?.(cliente.id)}
                    className="w-12 h-12 flex items-center justify-center bg-azul-primario text-white rounded-xl shadow-lg shadow-azul-primario/20 hover:bg-azul-primario/90 transition-all active:scale-95"
                  >
                    <FiMessageSquare size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}