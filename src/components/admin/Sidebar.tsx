'use client';

import { FiUsers, FiUserCheck, FiBriefcase, FiDollarSign, FiPieChart, FiSettings, FiLogOut, FiHome, FiX, FiClock, FiCreditCard, FiBell } from 'react-icons/fi';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import Image from 'next/image';
import Link from 'next/link';
import { SeccionAdmin } from '@/types/index';
import { useAuthStore } from '@/features/auth/store/authStore';
import { UserRole } from '@/shared/types/entities.types';
import { capitalizeName, formatLawyerName } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  seccionActiva: SeccionAdmin;
  setSeccionActiva: (seccion: SeccionAdmin) => void;
  handleLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ seccionActiva, setSeccionActiva, handleLogout, isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const { subscribe, isSubscribed, isPending, lastError } = usePushNotifications();
  
  const formattedName = user?.rol === UserRole.CLIENTE 
    ? capitalizeName(user.nombre) 
    : formatLawyerName(user?.nombre);

  const menuItems = [
    { id: 'dashboard', label: 'Inicio', icon: <FiHome /> },
    { id: 'abogados', label: 'Abogados', icon: <FiUserCheck /> },
    { id: 'clientes', label: 'Clientes', icon: <FiUsers /> },
    { id: 'casos', label: 'Casos y Expedientes', icon: <FiBriefcase /> },
    { id: 'finanzas', label: 'Finanzas', icon: <FiDollarSign /> },
    { id: 'estadisticas', label: 'Estadísticas', icon: <FiPieChart /> },
    { id: 'historial', label: 'Historial', icon: <FiClock /> },
    { id: 'pasarelas', label: 'Pasarelas', icon: <FiCreditCard /> },
    { id: 'configuracion', label: 'Ajustes', icon: <FiSettings /> },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-azul-primario text-white shadow-2xl relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-64 h-64 rounded-full bg-white blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 rounded-full bg-vinotinto blur-3xl opacity-20" />
      </div>

      <div className="p-6 relative flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1 flex justify-center lg:justify-start"
          >
            <Link href="/" className="transition-transform hover:scale-105 active:scale-95">
              <Image 
                src="/logo/logo_sf_1.png" 
                alt="VirtuAbogado Logo" 
                width={140} 
                height={48} 
                priority
                className="drop-shadow-md"
              />
            </Link>
          </motion.div>
          <button 
            onClick={onClose}
            className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Perfil de Usuario Premium */}
        <AnimatePresence>
          {user && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 px-1 shrink-0"
            >
              <div className="flex items-center p-4 bg-white/10 rounded-[1.5rem] border border-white/10 backdrop-blur-md shadow-xl">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-vinotinto to-rose-600 flex items-center justify-center text-white font-black text-xl shadow-lg border border-white/20 shrink-0">
                  {user.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-xs font-black text-white truncate tracking-tight">
                    {formattedName}
                  </p>
                  <div className="flex items-center mt-0.5">
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-lg uppercase tracking-wider bg-amber-500 text-azul-primario shadow-sm">
                       ADMINISTRADOR
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Navegación con Scroll interno si es necesario */}
        <nav className="space-y-1.5 overflow-y-auto flex-1 pr-2 custom-scrollbar pb-4">
          {menuItems.map((item, idx) => (
            <motion.button 
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => {
                setSeccionActiva(item.id as SeccionAdmin);
                onClose?.();
              }}
              className={`flex items-center space-x-3 w-full p-3 rounded-2xl transition-all duration-300 group
                ${seccionActiva === item.id 
                  ? 'bg-white text-azul-primario font-black shadow-lg shadow-black/10 translate-x-1' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1'
                }`}
            >
              <div className={`text-lg transition-transform group-hover:scale-110 ${seccionActiva === item.id ? 'text-azul-primario font-black' : ''}`}>
                {item.icon}
              </div>
              <span className="text-sm tracking-tight">{item.label}</span>
              {seccionActiva === item.id && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-azul-primario"
                />
              )}
            </motion.button>
          ))}

          {/* Botón Manual de Notificaciones Push (Fallback) */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            onClick={async () => {
              const success = await subscribe();
              if (success) alert('🎉 ¡Ca-Ching! Notificaciones activadas exitosamente.');
              else if (lastError) alert(`⚠️ ${lastError}`);
            }}
            disabled={isPending || isSubscribed}
            className={`flex items-center space-x-3 w-full p-3 rounded-2xl transition-all duration-300 group border border-white/10
              ${isSubscribed ? 'opacity-50 cursor-default' : 'text-amber-400 hover:bg-white/5 hover:translate-x-1'}
            `}
          >
            <div className={`text-lg transition-transform group-hover:scale-110`}>
              <FiBell />
            </div>
            <div className="flex flex-col items-start">
                <span className="text-sm tracking-tight font-bold">
                    {isSubscribed ? 'Notificaciones Activas' : 'Activar Notificaciones'}
                </span>
                {!isSubscribed && <span className="text-[9px] opacity-60 uppercase">Manual Ca-Ching 💰</span>}
            </div>
          </motion.button>

          {/* Botón de Diagnóstico Directo (Temporal para Pruebas) */}
          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            onClick={async () => {
              try {
                const response = await fetch('/api/notifications/test-push', { method: 'POST' });
                const result = await response.json();
                if (result.success) alert('🧪 Servidor dice: ' + result.message);
                else alert('❌ Error en el servidor: ' + (result.message || result.error));
              } catch (err) {
                alert('🚨 Error de red: ' + (err instanceof Error ? err.message : String(err)));
              }
            }}
            className="flex items-center space-x-3 w-full p-3 rounded-2xl transition-all duration-300 group border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:translate-x-1 mt-2"
          >
            <div className="text-lg">🛠️</div>
            <span className="text-xs font-bold uppercase tracking-tighter">PRUEBA PUSH</span>
          </motion.button>
        </nav>

        {/* Footer del Sidebar siempre visible abajo */}
        <div className="pt-4 border-t border-white/10 shrink-0 mt-2">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full p-3.5 rounded-2xl bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all duration-300 font-black text-xs uppercase tracking-widest group shadow-sm active:scale-95"
          >
            <FiLogOut className="text-lg group-hover:rotate-12 transition-transform" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Overlay para móvil con desenfoque */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 z-[60] lg:hidden backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Siempre visible en LG+) */}
      <div className="hidden lg:block fixed left-0 top-0 w-72 h-screen z-50">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar (Drawer con Framer Motion) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 w-[85%] sm:w-80 h-screen z-[70] lg:hidden"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}