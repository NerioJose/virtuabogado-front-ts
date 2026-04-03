'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuthStore } from '@/features/auth/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/features/chat/store/chatStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { FiBell, FiMessageCircle, FiX } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

/**
 * GlobalChatListener: Centraliza todas las suscripciones de Supabase Realtime (Broadcast)
 * para evitar crear múltiples conexiones WebSocket. Sincroniza el caché de TanStack Query
 * y muestra notificaciones (Toast, Sonido, Tab Title) en toda la aplicación.
 */
export default function GlobalChatListener() {
    const { user } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { isSubscribed, subscribe, permission } = usePushNotifications();
    const [showPushBanner, setShowPushBanner] = useState(false);
    const [toastMessage, setToastMessage] = useState<any>(null);
    const blinkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const originalTitleRef = useRef<string>('');

    useEffect(() => {
        if (!user) return;

        // Verificar si el usuario ya descartó este banner permanentemente
        const bannerDismissed = localStorage.getItem('push_banner_dismissed');
        if (bannerDismissed === 'true') return;

        // Mostrar banner de invitación a Push solo para Admin/Abogados que no estén suscritos
        if ((user.rol === 'ADMIN' || user.rol === 'ABOGADO') && !isSubscribed && permission === 'default') {
            const timer = setTimeout(() => setShowPushBanner(true), 5000); // 5s después del login
            return () => clearTimeout(timer);
        }
    }, [user, isSubscribed, permission]);

    const handleDismissBanner = () => {
        setShowPushBanner(false);
        localStorage.setItem('push_banner_dismissed', 'true');
    };

    useEffect(() => {
        if (!user) return;
        
        // Guardar el título original de la pestaña
        if (!originalTitleRef.current) {
            originalTitleRef.current = document.title || 'VirtuAbogado';
        }

        const supabase = createClient();

        // 0. SOLICITAR PERMISOS DE NOTIFICACIÓN (Browser Native)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(console.error);
        }
        
        // Nos suscribimos al canal global de este usuario específico
        const channel = supabase.channel(`global_${user.id}`);
        
        const subscription = channel.on(
            'broadcast',
            { event: 'new_message' },
            (payload) => {
                const data = payload.payload;

                // 1. MANEJAR MENSAJE NUEVO
                if (data.new) {
                    const newMessage = data.new;
                    const queryKey = ['chat', 'messages', newMessage.orderId];
                    
                    // Actualizar caché de TanStack Query instantáneamente
                    queryClient.setQueryData<any[]>(queryKey, (old) => {
                        const current = Array.isArray(old) ? old : [];
                        if (current.some(m => m.id === newMessage.id)) return current;
                        return [...current, newMessage];
                    });

                    // Si el mensaje es de otra persona, lanzar notificaciones
                    if (newMessage.senderId !== user.id) {
                        // Omitir notificaciones (Sonido/Toast) si ya estamos en ese chat abierto
                        const activeOrder = useChatStore.getState().activeOrderId;
                        if (activeOrder === newMessage.orderId) {
                            console.log("🤫 Silenciando notificación global porque el chat está activo.");
                        } else {
                            // A. Reproducir sonido de notificación
                            try {
                                const audio = new Audio('/virtuabogado-chat.mp3');
                                audio.volume = 1.0;
                                audio.play().catch(e => console.warn('🔇 Audio bloqueado por el navegador:', e));
                            } catch (err) {
                                console.error("Error al reproducir audio:", err);
                            }

                            // B. Mostrar Toast Notification (Barra flotante inferior)
                            setToastMessage(newMessage);

                            // C. Parpadeo en la Pestaña (Tab Notification)
                            if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current);
                            let isBlinking = true;
                            blinkIntervalRef.current = setInterval(() => {
                                document.title = isBlinking ? '(1) 💬 Nuevo Mensaje' : originalTitleRef.current;
                                isBlinking = !isBlinking;
                            }, 1000);

                            // D. Notificación Nativa del Navegador (Estilo WhatsApp/Facebook)
                            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                                try {
                                    const n = new Notification(`${newMessage.sender?.nombre || 'Alguien'} te escribió`, {
                                        body: newMessage.content.startsWith('http') ? '📷 Imagen o archivo enviado' : newMessage.content,
                                        icon: '/logo/logo_resized.png',
                                        tag: newMessage.orderId,
                                        requireInteraction: false
                                    });

                                    n.onclick = () => {
                                        window.focus();
                                        if (user?.rol === 'CLIENTE') router.push('/mis-servicios');
                                        else if (user?.rol === 'ABOGADO') router.push('/abogado');
                                        else router.push('/admin');
                                        n.close();
                                    };
                                } catch (err) {
                                    console.error("Error al lanzar notificación nativa:", err);
                                }
                            }
                        }

                        // E. Marcar como No Leído en el Store Global (siempre, el store ya filtra si está activo)
                        useChatStore.getState().markAsUnread(newMessage.orderId);

                        // Auto-cerrar notificaciones después de 10 segundos
                        setTimeout(() => {
                            setToastMessage(null);
                            if (blinkIntervalRef.current) {
                                clearInterval(blinkIntervalRef.current);
                                document.title = originalTitleRef.current;
                            }
                        }, 10000);
                    }
                }

                // 2. MANEJAR ELIMINACIÓN DE MENSAJE (Sincronización en Tiempo Real)
                if (data.deleted) {
                    const { id, orderId } = data.deleted;
                    const queryKey = ['chat', 'messages', orderId];
                    queryClient.setQueryData<any[]>(queryKey, (old) => {
                        const current = Array.isArray(old) ? old : [];
                        return current.filter(m => m.id !== id);
                    });
                }
            }
        ).subscribe();

        return () => {
            if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current);
            document.title = originalTitleRef.current || 'VirtuAbogado';
            subscription.unsubscribe();
        };
    }, [user, queryClient]);

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
                            className="pointer-events-auto w-80 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/60 overflow-hidden flex flex-col cursor-pointer hover:bg-white transition-all active:scale-95"
                            onClick={() => {
                                setToastMessage(null);
                                if (user?.rol === 'CLIENTE') router.push('/mis-servicios');
                                else if (user?.rol === 'ABOGADO') router.push('/abogado');
                                else router.push('/admin');
                            }}
                        >
                            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-azul-primario/10 to-transparent border-b border-gray-100">
                                <div className="flex items-center gap-2 text-azul-primario font-bold text-xs uppercase tracking-widest">
                                    <FiMessageCircle className="animate-bounce" />
                                    <span>Notificación</span>
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
                                <p className="font-bold text-gray-900 mb-1">
                                    {toastMessage.sender?.nombre || 'Alguien'} te escribió:
                                </p>
                                <p className="line-clamp-2 leading-relaxed opacity-80 italic">
                                    "{toastMessage.content.startsWith('http') ? '📷 Imagen o archivo enviado' : toastMessage.content}"
                                </p>
                                <p className="text-[10px] text-azul-primario mt-3 font-semibold text-right uppercase tracking-tighter">
                                    Haz clic para responder →
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
                            className="pointer-events-auto w-80 bg-azul-primario text-white p-5 rounded-2xl shadow-2xl flex flex-col gap-3 border border-white/20"
                        >
                            <div className="flex items-start justify-between">
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
                                <h4 className="font-bold text-lg mb-1">¡Activa el "Ca-Ching!" 💰</h4>
                                <p className="text-sm opacity-90 leading-relaxed">
                                    Recibe alertas de ventas y nuevos casos directamente en tu teléfono, incluso si no estás en la App.
                                </p>
                            </div>
                            <button
                                onClick={async () => {
                                    const success = await subscribe();
                                    if (success) setShowPushBanner(false);
                                }}
                                className="w-full bg-white text-azul-primario font-bold py-2.5 rounded-xl hover:bg-azul-claro hover:text-white transition-all active:scale-95 shadow-lg"
                            >
                                Activar Notificaciones
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}
