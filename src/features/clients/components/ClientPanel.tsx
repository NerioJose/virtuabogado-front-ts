'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch, 
  FiPlus, 
  FiMessageSquare, 
  FiEye, 
  FiClock, 
  FiCalendar, 
  FiCheckCircle, 
  FiChevronRight,
  FiFileText,
  FiMenu,
  FiUser,
  FiLock,
  FiShield,
  FiCheck
} from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import ClientSidebar from './ClientSidebar';
import ClientStats from './ClientStats';
import { getStatusColor, getStatusText, type ServicioCliente } from '@/features/orders';
import { useClientPanel } from '../hooks/useClientPanel';

interface ClientPanelProps {
  user: any;
  servicios: ServicioCliente[];
  unreadOrders: string[];
  isLoading: boolean;
  handleLogout: () => void;
}

export default function ClientPanel({
  user,
  servicios,
  unreadOrders,
  isLoading,
  handleLogout
}: ClientPanelProps) {
  const {
    seccionActiva,
    setSeccionActiva,
    tabActivo,
    setTabActivo,
    isSidebarOpen,
    setIsSidebarOpen,
    filtroEstado,
    setFiltroEstado,
    terminoBusqueda,
    setTerminoBusqueda,
    cambiandopassword,
    passwords,
    setPasswords,
    notificacion,
    statsData,
    activos,
    historial,
    handlePasswordChange,
  } = useClientPanel(servicios);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar Modular */}
      <ClientSidebar 
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
        handleLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userName={user?.nombre && !user.nombre.includes('@') ? user.nombre : (user?.email?.split('@')[0] || 'Usuario')}
        userEmail={user?.email || ''}
        userPicture={user?.picture}
      />

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 min-h-screen flex flex-col transition-all duration-500 min-w-0 overflow-x-hidden">
        
        {/* Top Header responsivo */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 transition-all">
          <div className="px-4 md:px-10 h-20 flex items-center justify-between max-w-[1600px] mx-auto w-full">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden w-11 h-11 flex items-center justify-center bg-azul-primario/5 text-azul-primario rounded-2xl active:scale-95 transition-all"
              >
                <FiMenu size={24} />
              </button>
              <div className="flex flex-col">
                <h1 className="text-xl md:text-2xl font-black text-azul-primario tracking-tight uppercase">
                  {seccionActiva === 'servicios' ? 'Mis Servicios' : 'Centro de Control'}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block mt-1">
                  VirtuAbogado Digital Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Buscador Desplegable en Móvil / Estático en Desktop */}
              <div className="relative group">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-slate-100/50 border-transparent border focus:border-azul-primario focus:bg-white rounded-2xl focus:outline-none transition-all w-32 sm:w-48 md:w-64 font-medium text-xs md:text-sm shadow-sm md:shadow-none"
                />
              </div>
              <Link href="/servicios">
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-azul-primario text-white rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-azul-primario/25 transition-all"
                >
                  <FiPlus className="md:size-4" />
                  <span className="hidden md:inline">Contratar Servicio</span>
                </motion.button>
              </Link>
            </div>
          </div>
        </header>

        {/* Dynamic Content Center */}
        <main className="p-4 md:p-10 max-w-[1600px] mx-auto w-full min-h-[calc(100vh-80px)]">
          
          <AnimatePresence mode="wait">
            {seccionActiva === 'servicios' && (
              <motion.div
                key="servicios"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Dashboard Stats */}
                <ClientStats stats={statsData} isLoading={isLoading} />

                {/* Selector de Pestañas Premium */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                  <div className="bg-white/50 backdrop-blur-sm p-1.5 rounded-[2rem] border border-slate-200/60 shadow-sm flex gap-1 w-fit">
                    <button
                      onClick={() => setTabActivo('activos')}
                      className={`px-8 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${
                        tabActivo === 'activos'
                          ? 'bg-azul-primario text-white shadow-lg shadow-azul-primario/25 scale-[1.02]'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Mis Expedientes Activos
                      {activos.length > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] ${tabActivo === 'activos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {activos.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setTabActivo('historial')}
                      className={`px-8 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${
                        tabActivo === 'historial'
                          ? 'bg-azul-primario text-white shadow-lg shadow-azul-primario/25 scale-[1.02]'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Historial de Servicios
                      {historial.length > 0 && (
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] ${tabActivo === 'historial' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {historial.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Filtro de estado secundario (Opcional, solo si el usuario quiere filtrar por un estado específico dentro de la pestaña) */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {(tabActivo === 'activos' 
                      ? (['todos', 'pendiente', 'programado', 'revision'] as const)
                      : (['todos', 'completado', 'cancelado'] as const)
                    ).map((estado) => (
                      <button
                        key={estado}
                        onClick={() => setFiltroEstado(estado as any)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                          filtroEstado === estado
                            ? 'bg-slate-800 text-white'
                            : 'bg-white text-slate-400 border border-slate-100'
                        }`}
                      >
                        {estado === 'programado' ? 'En Proceso' : estado === 'revision' ? 'Revisión' : estado}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Listado de Servicios: Expedientes Digitales Premium */}
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (tabActivo === 'activos' ? activos : historial).length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-200/60 shadow-sm">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FiFileText className="text-slate-300" size={40} />
                    </div>
                    <h3 className="text-xl font-black text-azul-primario uppercase tracking-tight">
                      {tabActivo === 'activos' ? 'Sin expedientes en curso' : 'Historial vacío'}
                    </h3>
                    <p className="text-slate-400 text-sm mt-1">
                      {tabActivo === 'activos' 
                        ? 'Actualmente no tienes procesos legales activos. ¡Contrata uno nuevo!' 
                        : 'Aún no tienes servicios finalizados en tu historial.'}
                    </p>
                  </div>
                ) : tabActivo === 'activos' ? (
                  <motion.div 
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 px-1"
                  >
                    {activos.filter(s => filtroEstado === 'todos' || s.estado === filtroEstado).map((servicio: any) => {
                      const isUnread = unreadOrders.includes(servicio.id);
                      // Determinar si es "Reciente" (creado en las últimas 48 horas)
                      const isRecent = servicio.createdAt && (Date.now() - new Date(servicio.createdAt).getTime()) < 48 * 60 * 60 * 1000;
                      
                      return (
                        <motion.div
                          layout
                          key={servicio.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm p-6 relative overflow-hidden group hover:shadow-xl hover:shadow-azul-primario/5 transition-all"
                        >
                          {isUnread && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
                          )}

                          {isRecent && (
                            <div className="absolute top-0 left-0 bg-emerald-500 text-white text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-br-2xl shadow-sm z-10">
                              Nuevo
                            </div>
                          )}

                          <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-azul-primario bg-azul-primario/5 px-3 py-1 rounded-xl">#{servicio.numeroOrden}</span>
                                {isUnread && (
                                  <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-bounce" />
                                )}
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{servicio.fecha}</p>
                            </div>
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(servicio.estado)}`}>
                              {getStatusText(servicio.estado)}
                            </span>
                          </div>

                          <div className="space-y-4 mb-6">
                            <div className="min-h-[64px]">
                              <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-azul-primario transition-colors">{servicio.nombre}</h3>
                              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{servicio.descripcion}</p>
                            </div>

                            {/* Detalles de Cita (Si aplica) */}
                            {servicio.estado === 'programado' && servicio.fechaCita && (
                              <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
                                  <FiCalendar size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest truncate">Cita Programada</p>
                                  <p className="text-xs font-black text-indigo-700 truncate">{servicio.fechaCita}</p>
                                </div>
                              </div>
                            )}

                            {/* Otros estados (Sin asignar, Completado) */}
                            {servicio.estado === 'pendiente' && (
                              <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-100/50 flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                                  <FiClock size={18} className="animate-pulse" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest truncate">Estado Pendiente</p>
                                  <p className="text-xs font-bold text-amber-700 line-clamp-1">Asignando abogado experto próximamente</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Final</p>
                              <p className="text-xl font-black text-azul-primario tracking-tighter">${servicio.precio.toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2">
                              <Link href={`/detalle-servicio/${servicio.id}#chat`} className="flex-1">
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                    isUnread ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-azul-primario text-white shadow-lg shadow-azul-primario/20'
                                  }`}
                                >
                                  {isUnread ? <FiMessageSquare /> : <FiMessageSquare />} Chat
                                </motion.button>
                              </Link>
                              <Link href={`/detalle-servicio/${servicio.id}`}>
                                <motion.button
                                  whileHover={{ scale: 1.05, x: 2 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all shadow-sm"
                                  title="Ver Detalles"
                                >
                                  <FiEye size={20} />
                                </motion.button>
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  /* VISTA DE HISTORIAL: Híbrida (Tabla en Desktop, Mini-Cards en Mobile) */
                  <div className="space-y-4">
                    {/* 🖥️ Tabla para Tablets, PCs y Televisores */}
                    <div className="hidden md:block bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead className="bg-slate-50/50">
                            <tr>
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Expediente</th>
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Causa Legal</th>
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest capitalize">Fecha</th>
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto</th>
                              <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {historial.filter(s => filtroEstado === 'todos' || s.estado === filtroEstado).map((servicio: any) => (
                              <motion.tr 
                                key={servicio.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="group hover:bg-slate-50/50 transition-colors"
                              >
                                <td className="px-8 py-5 text-sm font-black text-azul-primario tracking-tighter">#{servicio.numeroOrden}</td>
                                <td className="px-8 py-5">
                                  <p className="text-sm font-black text-slate-700">{servicio.nombre}</p>
                                </td>
                                <td className="px-8 py-5 text-xs font-bold text-slate-400">{servicio.fecha}</td>
                                <td className="px-8 py-5">
                                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(servicio.estado)}`}>
                                    {getStatusText(servicio.estado)}
                                  </span>
                                </td>
                                <td className="px-8 py-5 text-sm font-black text-slate-700">${servicio.precio.toLocaleString()}</td>
                                <td className="px-8 py-5 text-right">
                                  <div className="flex justify-end gap-2">
                                    <Link href={`/detalle-servicio/${servicio.id}`}>
                                      <button className="p-2.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-azul-primario hover:text-white transition-all shadow-sm">
                                        <FiEye size={18} />
                                      </button>
                                    </Link>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 📱 Mini-Cards para Móviles (Evita scroll horizontal) */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                      {historial.filter(s => filtroEstado === 'todos' || s.estado === filtroEstado).map((servicio: any) => (
                        <motion.div 
                          key={servicio.id}
                          className="bg-white p-5 rounded-[2rem] border border-slate-200/60 shadow-sm flex items-center justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-azul-primario bg-azul-primario/5 px-2 py-0.5 rounded-lg">#{servicio.numeroOrden}</span>
                              <span className="text-[10px] font-bold text-slate-400">{servicio.fecha}</span>
                            </div>
                            <h4 className="text-sm font-black text-slate-800 truncate">{servicio.nombre}</h4>
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${getStatusColor(servicio.estado)}`}>
                                {getStatusText(servicio.estado)}
                              </span>
                              <span className="text-xs font-black text-slate-700">${servicio.precio.toLocaleString()}</span>
                            </div>
                          </div>
                          <Link href={`/detalle-servicio/${servicio.id}`}>
                            <button className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center active:bg-azul-primario active:text-white transition-all">
                              <FiEye size={20} />
                            </button>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {seccionActiva === 'perfil' && (
              <motion.div
                key="perfil"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white rounded-[2rem] sm:rounded-[3rem] border border-slate-200/60 shadow-sm p-6 sm:p-10 max-w-2xl mx-auto w-full"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-azul-primario/5 border-2 border-dashed border-azul-primario/20 flex items-center justify-center p-2 overflow-hidden shadow-inner">
                      {user?.picture ? (
                        <Image src={user.picture} alt={user.nombre} width={128} height={128} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <FiUser size={48} className="text-azul-primario" />
                      )}
                    </div>
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight">{user?.nombre || 'Usuario VirtuAbogado'}</h2>
                  <p className="text-slate-400 font-bold uppercase tracking-widest mt-1">{user?.email}</p>
                </div>

                <div className="mt-12 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Teléfono</p>
                      <p className="font-bold text-slate-700">{user?.telefono || 'No registrado'}</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Miembro desde</p>
                      <p className="font-bold text-slate-700">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                  <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center">
                    <p className="text-sm font-bold text-slate-400 mb-4">¿Deseas actualizar tus datos personales?</p>
                    <button className="px-8 py-3 bg-white border-2 border-azul-primario text-azul-primario rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-azul-primario hover:text-white transition-all">
                      Editar Perfil
                    </button>
                  </div>
                </div>

                {/* Sección de Seguridad */}
                <div className="mt-10 pt-10 border-t border-slate-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                      <FiShield size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Seguridad</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Protege tu cuenta VirtuAbogado</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-5 text-left max-w-md mx-auto md:mx-0">
                    {notificacion && (
                      <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${notificacion.tipo === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        {notificacion.tipo === 'success' ? <FiCheckCircle /> : <FiLock />}
                        {notificacion.mensaje}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contraseña Actual</label>
                      <div className="relative">
                        <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input 
                          type="password" 
                          required
                          value={passwords.actual}
                          onChange={(e) => setPasswords({...passwords, actual: e.target.value})}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent border-2 focus:border-azul-primario focus:bg-white rounded-[1.5rem] focus:outline-none transition-all font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nueva Contraseña</label>
                        <input 
                          type="password" 
                          required
                          value={passwords.nueva}
                          onChange={(e) => setPasswords({...passwords, nueva: e.target.value})}
                          placeholder="••••••••"
                          className="w-full px-6 py-4 bg-slate-50 border-transparent border-2 focus:border-azul-primario focus:bg-white rounded-[1.5rem] focus:outline-none transition-all font-bold text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Confirmar Nueva</label>
                        <input 
                          type="password" 
                          required
                          value={passwords.confirmar}
                          onChange={(e) => setPasswords({...passwords, confirmar: e.target.value})}
                          placeholder="••••••••"
                          className="w-full px-6 py-4 bg-slate-50 border-transparent border-2 focus:border-azul-primario focus:bg-white rounded-[1.5rem] focus:outline-none transition-all font-bold text-sm"
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={cambiandopassword}
                        className="w-full py-5 bg-azul-primario text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-azul-primario/20 hover:shadow-azul-primario/40 transition-all disabled:opacity-50"
                      >
                        {cambiandopassword ? 'Procesando...' : 'Actualizar Credenciales'}
                      </motion.button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </main>
      </div>
    </div>
  );
}
