'use client';

import React from 'react';
import { FiBell, FiLoader, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { motion, AnimatePresence } from 'framer-motion';

interface PushNotificationToggleProps {
  className?: string;
}

export default function PushNotificationToggle({ className = '' }: PushNotificationToggleProps) {
  const { isSubscribed, isPending, subscribe, unsubscribe, lastError, permission } = usePushNotifications();

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <button type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`
          w-full flex items-center px-4 py-3.5 rounded-2xl transition duration-300 relative overflow-hidden group
          ${isPending ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'}
          ${isSubscribed 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' 
            : 'bg-slate-50 text-slate-500 border border-slate-200 hover:border-azul-primario/30'
          }
        `}
      >
        {/* Indicador de estado animado */}
        <div className={`mr-3 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
          isSubscribed ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 group-hover:text-azul-primario shadow-sm'
        }`}>
          {isPending ? (
            <FiLoader className="animate-spin" size={18} />
          ) : isSubscribed ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <FiBell className="animate-bounce" size={18} />
            </motion.div>
          ) : (
            <FiBell size={18} />
          )}
        </div>

        <div className="flex flex-col text-left flex-1 min-w-0">
          <span className="text-[11px] font-black uppercase tracking-tight">
            {isSubscribed ? 'Alertas Activas' : 'Activar Notificaciones'}
          </span>
          <span className="text-[9px] font-bold opacity-60 uppercase truncate">
            {isSubscribed ? 'Recibirás avisos en tiempo real' : 'Recibe noticias de tus casos'}
          </span>
        </div>

        {/* Badge de estado en el botón */}
        <AnimatePresence>
          {isSubscribed && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="ml-2"
            >
              <FiCheckCircle className="text-emerald-500" size={14} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* Mensajes de error o advertencia */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-2 px-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
              <FiAlertCircle className="text-red-500 mt-0.5 shrink-0" size={12} />
              <p className="text-[9px] font-bold text-red-600 leading-tight">
                {lastError}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Aviso de permiso denegado persistente */}
      {permission === 'denied' && (
        <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-[9px] font-bold text-amber-700 leading-tight">
            ⚠️ Navegador bloqueado. Activa las notificaciones en la configuración del candado 🔒 de tu navegador para poder recibir alertas.
          </p>
        </div>
      )}
    </div>
  );
}
