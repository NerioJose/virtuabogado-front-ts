'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiBriefcase, FiDollarSign, FiMessageCircle, FiX } from 'react-icons/fi';
import { useGlobalChatListener } from '../hooks/useGlobalChatListener';

/**
 * GlobalChatListener: Centraliza todas las suscripciones de Supabase Realtime (Broadcast)
 * para evitar crear múltiples conexiones WebSocket. Sincroniza el caché de TanStack Query
 * y muestra notificaciones (Toast, Sonido, Tab Title) en toda la aplicación.
 */
export default function GlobalChatListener() {
    const {
        user,
        toastMessage,
        setToastMessage,
        showPushBanner,
        handleDismissBanner,
        isSubscribing,
        handleSubscribe,
        permission,
        router,
    } = useGlobalChatListener();

    return (
        <>
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            key={toastMessage.id}
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, x: 100 }}
                            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                            className={`pointer-events-auto w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 overflow-hidden flex flex-col cursor-pointer hover:bg-white transition-all active:scale-95
                                ${toastMessage.type === 'sale' ? 'ring-2 ring-amber-400' : 
                                  toastMessage.type === 'case' ? 'ring-2 ring-emerald-400' : ''}
                            `}
                            onClick={() => {
                                setToastMessage(null);
                                if (user?.rol === 'CLIENTE') router.push('/mis-servicios');
                                else if (user?.rol === 'ABOGADO') router.push('/abogado');
                                else router.push('/admin');
                            }}
                        >
                            <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r
                                ${toastMessage.type === 'sale' ? 'from-amber-400/20 to-transparent' : 
                                  toastMessage.type === 'case' ? 'from-emerald-400/20 to-transparent' : 
                                  'from-vinotinto/10 to-transparent'}
                            `}>
                                <div className={`flex items-center gap-2 font-bold text-xs uppercase tracking-widest
                                    ${toastMessage.type === 'sale' ? 'text-amber-600' : 
                                      toastMessage.type === 'case' ? 'text-emerald-600' : 
                                      'text-vinotinto'}
                                `}>
                                    {toastMessage.type === 'sale' ? <FiDollarSign className="animate-pulse" /> : 
                                     toastMessage.type === 'case' ? <FiBriefcase className="animate-pulse" /> : 
                                     <FiMessageCircle className="animate-bounce" />}
                                    <span>{toastMessage.title || 'Notificación'}</span>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setToastMessage(null);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <FiX size={16} />
                                </button>
                            </div>
                            <div className="px-4 py-4 text-sm text-gray-700">
                                {toastMessage.type === 'chat' ? (
                                    <>
                                        <p className="font-bold text-gray-900 mb-1">
                                            {toastMessage.sender?.nombre || 'Alguien'} te escribió:
                                        </p>
                                        <p className="line-clamp-2 leading-relaxed opacity-80 italic">
                                            "{toastMessage.content?.startsWith('http') ? '📷 Imagen o archivo enviado' : toastMessage.content}"
                                        </p>
                                    </>
                                ) : (
                                    <p className="opacity-90 leading-relaxed font-medium">
                                        {toastMessage.content}
                                    </p>
                                )}
                                <p className={`text-[10px] mt-3 font-semibold text-right uppercase tracking-tighter
                                    ${toastMessage.type === 'sale' ? 'text-amber-600' : 
                                      toastMessage.type === 'case' ? 'text-emerald-600' : 
                                      'text-vinotinto'}
                                `}>
                                    Haz clic para gestionar →
                                </p>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

                {/* 🔔 BANNER DE INVITACIÓN A NOTIFICACIONES PUSH (Estilo Shopify) */}
                <AnimatePresence>
                    {showPushBanner && (
                        <motion.div
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            className="pointer-events-auto w-80 bg-gradient-to-br from-vinotinto to-[#7a1b1e] text-white p-5 rounded-2xl shadow-2xl flex flex-col gap-3 border border-white/20 relative overflow-hidden"
                        >
                            {/* Decorative element for premium feel */}
                            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                            
                            <div className="flex items-start justify-between relative z-10">
                                <div className="p-2 bg-white/20 rounded-lg">
                                    <FiBell />
                                </div>
                                <button 
                                    onClick={handleDismissBanner}
                                    className="p-1 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <FiX size={18} />
                                </button>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg mb-1">
                                    {permission === 'denied' ? '🚨 Notificaciones Bloqueadas' : '¡Activa el "Ca-Ching!" 💰'}
                                </h4>
                                <p className="text-sm opacity-90 leading-relaxed">
                                    {permission === 'denied' 
                                        ? 'Has bloqueado las notificaciones. Haz clic en el candado en la barra de URL para permitir el acceso.' 
                                        : typeof window !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window.navigator as any).standalone
                                            ? '📲 En iPhone, primero debes "Añadir a Inicio" (botón compartir) para poder activar las notificaciones.'
                                            : 'Recibe alertas de ventas y nuevos casos directamente en tu teléfono, incluso si no estás en la App.'}
                                </p>
                            </div>
                            <div className="relative z-10 flex flex-col gap-2">
                                {permission !== 'denied' ? (
                                    <button
                                        onClick={handleSubscribe}
                                        disabled={isSubscribing}
                                        className={`w-full bg-white text-vinotinto font-bold py-2.5 rounded-xl transition-all active:scale-95 shadow-lg border border-vinotinto/20 ${
                                            isSubscribing ? 'opacity-50 cursor-wait' : 'hover:bg-gray-100'
                                        }`}
                                    >
                                        {isSubscribing ? 'Configurando...' : 'Activar Notificaciones'}
                                    </button>
                                ) : (
                                    <div className="bg-white/20 p-2 rounded-lg text-[10px] uppercase font-bold text-center border border-white/10">
                                        Desbloquea en la barra de URL para continuar
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
