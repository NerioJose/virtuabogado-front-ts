import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/features/chat/store/chatStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRouter } from 'next/navigation';
import { useCheckoutStore } from '@/features/checkout/store/checkoutStore';

// ─── AUDIO POOL: un solo elemento reutilizable ───────────────────
let audioEl: HTMLAudioElement | null = null;
function playSound() {
    try {
        if (!audioEl) audioEl = new Audio('/virtuabogado-chat.mp3');
        audioEl.volume = 1.0;
        audioEl.currentTime = 0;
        audioEl.play().catch(() => {});
    } catch (err) {
        console.error("Error al reproducir audio:", err);
    }
}

// ─── TAB BLINK THROTTLED ────────────────────────────────────────
const blinkState = {
    ref: null as NodeJS.Timeout | null,
    originalTitle: '',
    active: false,
};

function blinkTab(text: string) {
    if (blinkState.active) return;
    blinkState.active = true;

    if (!blinkState.originalTitle) {
        blinkState.originalTitle = document.title || 'VirtuAbogado';
    }

    let isBlinking = true;
    blinkState.ref = setInterval(() => {
        document.title = isBlinking ? `(1) ${text}` : blinkState.originalTitle;
        isBlinking = !isBlinking;
    }, 1000);

    setTimeout(() => {
        if (blinkState.ref) clearInterval(blinkState.ref);
        document.title = blinkState.originalTitle;
        blinkState.active = false;
    }, 10000);
}

function stopBlink() {
    if (blinkState.ref) clearInterval(blinkState.ref);
    if (blinkState.originalTitle) document.title = blinkState.originalTitle;
    blinkState.active = false;
}

// ─── TOAST DEBOUNCE: agrupa eventos rápidos ─────────────────────
const toastState = {
    timer: null as NodeJS.Timeout | null,
    setter: null as ((msg: any) => void) | null,
};

function showToast(setter: typeof toastState.setter, msg: any) {
    toastState.setter = setter;
    if (toastState.timer) clearTimeout(toastState.timer);
    setter(msg);
    toastState.timer = setTimeout(() => {
        setter(null);
        toastState.timer = null;
    }, 5000);
}

export function useGlobalChatListener() {
    const { user } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();
    const { isSubscribed, subscribe, permission, lastError } = usePushNotifications();
    const [showPushBanner, setShowPushBanner] = useState(false);
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [toastMessage, setToastMessage] = useState<any>(null);
    const toastSetterRef = useRef(setToastMessage);
    toastSetterRef.current = setToastMessage;

    useEffect(() => {
        if (!user) return;
        if (isSubscribed && permission === 'granted') return;

        if (user.rol === 'ADMIN' || user.rol === 'ABOGADO') {
            const timer = setTimeout(() => setShowPushBanner(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [user, isSubscribed, permission]);

    const handleDismissBanner = () => {
        setShowPushBanner(false);
    };



    useEffect(() => {
        if (!user) return;

        const supabase = createClient();
        const personalChannel = supabase.channel(`global_${user.id}`);
        const globalChannel = user.rol === 'ADMIN' ? supabase.channel('app-updates') : null;

        const handleOrderUpdate = (payload: { payload: any }) => {
            const data = payload.payload;
            
            queryClient.invalidateQueries({ queryKey: ['Order'] });
            queryClient.invalidateQueries({ queryKey: ['User'] });
            queryClient.invalidateQueries({ queryKey: ['FinanceSummaryDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['FinancialSummary'] });

            const isRelevantForAdmin = user.rol === 'ADMIN';
            const isRelevantForLawyer = user.rol === 'ABOGADO' && data.lawyerId === user.id;
            const isRelevantForClient = user.rol === 'CLIENTE' && data.userId === user.id;

            if (data.eventType === 'created' && (isRelevantForAdmin || user.rol === 'ABOGADO')) {
                playSound();
                showToast(toastSetterRef.current, {
                    id: `sale-${data.orderId}-${Date.now()}`,
                    type: 'sale',
                    title: '💰 Nueva Venta Confirmada',
                    content: `Se ha registrado una nueva orden (#${data.orderId.substring(0, 8)}).`,
                    orderId: data.orderId
                });
                blinkTab('💰 ¡NUEVA VENTA!');
            } 
            else if (isRelevantForClient && data.eventType === 'updated') {
                playSound();
                
                let title = '📈 Actualización de Caso';
                let content = `Tu caso #${data.orderId.substring(0, 8)} ha sido actualizado.`;
                
                if (data.status === 'EN_PROGRESO' || data.isNewAssignment) {
                    title = '⚖️ Abogado Asignado';
                    content = 'Un abogado experto ha sido asignado a tu caso y ya puedes chatear.';
                } else if (data.status === 'COMPLETADO') {
                    title = '✅ Caso Finalizado';
                    content = 'Tu abogado ha marcado el caso como completado. ¡Revisa los resultados!';
                }

                showToast(toastSetterRef.current, {
                    id: `client-update-${data.orderId}-${Date.now()}`,
                    type: 'case',
                    title,
                    content,
                    orderId: data.orderId
                });
            }
            else if (data.isNewAssignment && data.lawyerId === user.id && isRelevantForLawyer) {
                playSound();
                showToast(toastSetterRef.current, {
                    id: `case-${data.orderId}-${Date.now()}`,
                    type: 'case',
                    title: '⚖️ Nuevo Caso Asignado',
                    content: `Se te ha asignado el caso #${data.orderId.substring(0,8)}. ¡Empieza ahora!`,
                    orderId: data.orderId
                });
                blinkTab('⚖️ NUEVO CASO');
            }

            const successStatuses = ['PENDIENTE', 'EN_PROGRESO', 'PAID', 'COMPLETADO'];
            if (successStatuses.includes(data?.status) && isRelevantForClient) {
                const checkoutState = useCheckoutStore.getState();
                
                if (
                    checkoutState.isWaitingForWebhook &&
                    checkoutState.orderId === data?.orderId
                ) {
                    checkoutState.setIsWaitingForWebhook(false);
                    window.localStorage.removeItem('virtuabogado_pending_order');
                    checkoutState.reset();
                    router.push('/mis-servicios');
                }
            }
        };

        const handlePayoutUpdate = (payload: { payload: any }) => {
            const data = payload.payload;
            const isRelevantForAdmin = user?.rol === 'ADMIN';
            const isRelevantForLawyer = user?.rol === 'ABOGADO' && data.lawyerId === user?.id;

            if (!isRelevantForAdmin && !isRelevantForLawyer) return;

            if (data.eventType === 'created' && isRelevantForAdmin) {
                playSound();
                showToast(toastSetterRef.current, {
                    id: `payout-created-${data.payoutId}-${Date.now()}`,
                    type: 'sale',
                    title: '💸 Liquidación Creada',
                    content: `Se ha creado una liquidación pendiente (#${data.payoutId.substring(0,8)}).`,
                    orderId: data.payoutId
                });
                blinkTab('💸 LIQUIDACIÓN PENDIENTE');
            }

            if (data.eventType === 'finalized' && isRelevantForLawyer) {
                playSound();
                showToast(toastSetterRef.current, {
                    id: `payout-finalized-${data.payoutId}-${Date.now()}`,
                    type: 'case',
                    title: '💰 Honorarios Transferidos',
                    content: 'Tu liquidación ha sido procesada. Revisa tu cuenta bancaria.',
                    orderId: data.payoutId
                });
                blinkTab('💰 HONORARIOS RECIBIDOS');
            }
        };

        const personalSub = personalChannel
            .on(
                'broadcast' as any,
                { event: 'new_message' },
                (payload: any) => {
                    const data = payload.payload;

                    if (data.new) {
                        const newMessage = data.new;
                        const queryKey = ['chat', 'messages', newMessage.orderId];
                        
                        queryClient.setQueryData<any[]>(queryKey, (old) => {
                            const current = Array.isArray(old) ? old : [];
                            if (current.some(m => m.id === newMessage.id)) return current;
                            return [...current, newMessage];
                        });

                        if (newMessage.senderId !== user.id) {
                            const activeOrder = useChatStore.getState().activeOrderId;
                            if (activeOrder !== newMessage.orderId) {
                                playSound();
                                setToastMessage({ ...newMessage, type: 'chat' });
                                blinkTab('💬 Nuevo Mensaje');
                            }
                            useChatStore.getState().markAsUnread(newMessage.orderId);
                            // Badge en icono del Home Screen
                            if ('setAppBadge' in navigator) {
                                const unread = useChatStore.getState().unreadOrders;
                                navigator.setAppBadge(unread.length).catch(() => {});
                            }
                        }
                    }

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
            .on('broadcast', { event: 'payout-updated' }, handlePayoutUpdate)
            .subscribe();

        if (globalChannel) {
            globalChannel
                .on('broadcast', { event: 'order-updated' }, handleOrderUpdate)
                .on('broadcast', { event: 'payout-updated' }, handlePayoutUpdate)
                .subscribe();
        }

        return () => {
            stopBlink();
            personalSub.unsubscribe();
            if (globalChannel) globalChannel.unsubscribe();
        };
    }, [user?.id, user?.rol]);

    const handleSubscribe = async () => {
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
    };

    return {
        user,
        toastMessage,
        setToastMessage,
        showPushBanner,
        handleDismissBanner,
        isSubscribing,
        handleSubscribe,
        permission,
        router,
    };
}
