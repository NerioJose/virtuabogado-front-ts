import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/features/chat/store/chatStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRouter } from 'next/navigation';
import { useCheckoutStore } from '@/features/checkout/store/checkoutStore';

export function useGlobalChatListener() {
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
        if (isSubscribed && permission === 'granted') return;

        if (user.rol === 'ADMIN' || user.rol === 'ABOGADO') {
            const timer = setTimeout(() => setShowPushBanner(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [user, isSubscribed, permission]);

    const handleDismissBanner = () => {
        setShowPushBanner(false);
    };

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

        setTimeout(() => {
            if (blinkIntervalRef.current) {
                clearInterval(blinkIntervalRef.current);
                document.title = originalTitleRef.current;
            }
        }, 10000);
    };

    useEffect(() => {
        if (!user) return;
        
        if (!originalTitleRef.current) {
            originalTitleRef.current = document.title || 'VirtuAbogado';
        }

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
                                playNotificationSound();
                                setToastMessage({ ...newMessage, type: 'chat' });
                                triggerTabBlink('💬 Nuevo Mensaje');
                            }
                            useChatStore.getState().markAsUnread(newMessage.orderId);
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
