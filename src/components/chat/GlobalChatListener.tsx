'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuthStore } from '@/features/auth/store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/features/chat/store/chatStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { FiBell, FiBriefcase, FiDollarSign, FiMessageCircle, FiX } from 'react-icons/fi';
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
    const { isSubscribed, subscribe, permission, lastError } = usePushNotifications();
    const [showPushBanner, setShowPushBanner] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [toastMessage, setToastMessage] = useState<any>(null);
    const blinkIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const originalTitleRef = useRef<string>('');

    useEffect(() => {
        if (!user) return;

        // DEBUG: Reset dismissal status if user is in testing
        // const bannerDismissed = localStorage.getItem('push_banner_dismissed');
        // if (bannerDismissed === 'true') return;

        // Mostrar banner de invitación a Push solo para Admin/Abogados que no tengan permiso concedido
        // Si ya está suscrito Y tiene el permiso, no mostramos nada
        if (isSubscribed && permission === 'granted') return;

        if (user.rol === 'ADMIN' || user.rol === 'ABOGADO') {
            const timer = setTimeout(() => setShowPushBanner(true), 3000); // 3s después del login
            return () => clearTimeout(timer);
        }
    }, [user, isSubscribed, permission]);

    const handleDismissBanner = () => {
        setShowPushBanner(false);
        // localStorage.setItem('push_banner_dismissed', 'true');
    };

    // 0. FUNCIONES DE UTILIDAD PARA ALERTAS
    const playNotificationSound = () => {
        try {
            const audio = new Audio('/virtuabogado-chat.mp3');
            audio.volume = 1.0;
            audio.play().catch(e => console.warn('🔇 Audio bloqueado por el navegador:', e));
        } catch (err) {
            console.error("Error al reproducir audio:", err);
        }
    };

    const triggerTabBlink = (text: string) => {
        if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current);
        let isBlinking = true;
        blinkIntervalRef.current = setInterval(() => {
            document.title = isBlinking ? `(1) ${text}` : originalTitleRef.current;
            isBlinking = !isBlinking;
        }, 1000);

        // Auto-limpiar después de 10 segundos
        setTimeout(() => {
            if (blinkIntervalRef.current) {
                clearInterval(blinkIntervalRef.current);
                document.title = originalTitleRef.current;
            }
        }, 10000);
    };

    useEffect(() => {
        if (!user) return;
        
        // Guardar el título original de la pestaña
        if (!originalTitleRef.current) {
            originalTitleRef.current = document.title || 'VirtuAbogado';
        }

        const supabase = createClient();
        
        // 1. Canal Personal (Mensajes y actualizaciones dirigidas)
        const personalChannel = supabase.channel(`global_${user.id}`);
        
        // 2. Canal Global (Solo para Admins para ver todas las ventas/alertas)
        const globalChannel = user.rol === 'ADMIN' ? supabase.channel('app-updates') : null;

        const handleOrderUpdate = (payload: any) => {
            const data = payload.payload;
            console.log('📦 [Global Listener] Order Update detectado:', data);

            // 🔄 INVALIDAR CACHÉ: Esto forzará que FacturacionPanel y todas las tablas se refresquen en tiempo real
            // 🔄 INVALIDAR CACHÉ: Usando la convención de nombres de tabla de la base de datos
            queryClient.invalidateQueries({ queryKey: ['Order'] });
            queryClient.invalidateQueries({ queryKey: ['User'] });
            queryClient.invalidateQueries({ queryKey: ['FinanceSummaryDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['FinancialSummary'] });

            const isRelevantForAdmin = user.rol === 'ADMIN';
            const isRelevantForLawyer = user.rol === 'ABOGADO' && data.lawyerId === user.id;
            const isRelevantForClient = user.rol === 'CLIENTE' && data.userId === user.id;

            // REGLA: Notificar Nueva Venta a Admins y Abogados (si es su caso o general)
            if (data.eventType === 'created' && (isRelevantForAdmin || user.rol === 'ABOGADO')) {
                playNotificationSound();
                setToastMessage({
                    id: `sale-${data.orderId}-${Date.now()}`,
                    type: 'sale',
                    title: '💰 Nueva Venta Confirmada',
                    content: `Se ha registrado una nueva orden (#${data.orderId.substring(0, 8)}).`,
                    orderId: data.orderId
                });
                triggerTabBlink('💰 ¡NUEVA VENTA!');
            } 
            // REGLA: Notificar Acción a Clientes (Asignación, Pago Confirmado, etc)
            else if (isRelevantForClient && data.eventType === 'updated') {
                playNotificationSound();
                
                let title = '📈 Actualización de Caso';
                let content = `Tu caso #${data.orderId.substring(0, 8)} ha sido actualizado.`;
                
                if (data.status === 'EN_PROGRESO' || data.isNewAssignment) {
                    title = '⚖️ Abogado Asignado';
                    content = 'Un abogado experto ha sido asignado a tu caso y ya puedes chatear.';
                } else if (data.status === 'COMPLETADO') {
                    title = '✅ Caso Finalizado';
                    content = 'Tu abogado ha marcado el caso como completado. ¡Revisa los resultados!';
                }

                setToastMessage({
                    id: `client-update-${data.orderId}-${Date.now()}`,
                    type: 'case',
                    title,
                    content,
                    orderId: data.orderId
                });
            }
            // REGLA: Notificar Asignación Directa a Abogados
            else if (data.isNewAssignment && data.lawyerId === user.id && isRelevantForLawyer) {
                playNotificationSound();
                setToastMessage({
                    id: `case-${data.orderId}-${Date.now()}`,
                    type: 'case',
                    title: '⚖️ Nuevo Caso Asignado',
                    content: `Se te ha asignado el caso #${data.orderId.substring(0,8)}. ¡Empieza ahora!`,
                    orderId: data.orderId
                });
                triggerTabBlink('⚖️ NUEVO CASO');
            }

            // ─── Redirección automática post-pago para Clientes ──────────────────
            const successStatuses = ['PENDIENTE', 'EN_PROGRESO', 'PAID', 'COMPLETADO'];
            if (successStatuses.includes(data?.status) && isRelevantForClient) {
                const { useCheckoutStore } = require('@/features/checkout/store/checkoutStore');
                const checkoutState = useCheckoutStore.getState();
                
                if (
                    checkoutState.isWaitingForWebhook &&
                    checkoutState.orderId === data?.orderId
                ) {
                    console.log('💰 [Global Listener] Pago confirmado. Redirigiendo...');
                    checkoutState.setIsWaitingForWebhook(false);
                    window.localStorage.removeItem('virtuabogado_pending_order');
                    checkoutState.reset();
                    router.push('/mis-servicios');
                }
            }
        };

        const personalSub = personalChannel
            .on(
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
                                playNotificationSound();

                                // B. Mostrar Toast Notification
                                setToastMessage({ ...newMessage, type: 'chat' });

                                // C. Parpadeo en la Pestaña
                                triggerTabBlink('💬 Nuevo Mensaje');
                            }

                            // E. Marcar como No Leído en el Store Global
                            useChatStore.getState().markAsUnread(newMessage.orderId);
                        }
                    }

                    // 2. MANEJAR ELIMINACIÓN DE MENSAJE
                    if (data.deleted) {
                        const { id, orderId } = data.deleted;
                        const queryKey = ['chat', 'messages', orderId];
                        queryClient.setQueryData<any[]>(queryKey, (old) => {
                            const current = Array.isArray(old) ? old : [];
                            return current.filter(m => m.id !== id);
                        });
                    }
                }
            )
            .on('broadcast', { event: 'order-updated' }, handleOrderUpdate)
            .subscribe();

        if (globalChannel) {
            globalChannel.on('broadcast', { event: 'order-updated' }, handleOrderUpdate).subscribe();
        }

        return () => {
            if (blinkIntervalRef.current) clearInterval(blinkIntervalRef.current);
            document.title = originalTitleRef.current || 'VirtuAbogado';
            personalSub.unsubscribe();
            if (globalChannel) globalChannel.unsubscribe();
        };
    }, [user, queryClient, router]);

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
                                        onClick={async () => {
                                            if (isSubscribing) return;
                                            setIsSubscribing(true);
                                            try {
                                                const success = await subscribe();
                                                if (success) {
                                                    alert('🎉 ¡Ca-Ching! Notificaciones activadas exitosamente.');
                                                    setShowPushBanner(false);
                                                } else {
                                                    alert(`⚠️ No se pudo completar la suscripción.\n\nDetalle: ${lastError || 'Error desconocido'}`);
                                                }
                                            } catch (err) {
                                                alert('❌ Error crítico: ' + (err instanceof Error ? err.message : String(err)));
                                            } finally {
                                                setIsSubscribing(false);
                                            }
                                        }}
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
