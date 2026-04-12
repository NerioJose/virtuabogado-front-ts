import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useCheckout } from '../hooks/useCheckout';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { processPaymentAction } from '../actions/processPaymentAction';
import { toast } from 'sonner';

export const usePaymentStep = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { 
        service, 
        setStep, 
        orderId,
        setOrderId,
        isProcessingPayment, 
        setIsProcessingPayment,
        isWaitingForWebhook,
        setIsWaitingForWebhook,
        reset
    } = useCheckout();

    const [showFallbackButton, setShowFallbackButton] = useState(false);

    // Persistance cache
    useEffect(() => {
        if (orderId) {
            localStorage.setItem('virtuabogado_pending_order', orderId);
        } else if (isWaitingForWebhook) {
            const savedOrder = localStorage.getItem('virtuabogado_pending_order');
            if (savedOrder) setOrderId(savedOrder);
        }
    }, [orderId, isWaitingForWebhook, setOrderId]);

    const { data: statusData } = useOrderStatus(orderId, isWaitingForWebhook);
    const currentRawStatus = statusData?.status?.trim().toUpperCase();
    const isPaid = currentRawStatus === 'PAID';

    useEffect(() => {
        if (statusData) {
            
        }
    }, [statusData]);

    useEffect(() => {
        if (!isWaitingForWebhook || isPaid) {
            setShowFallbackButton(false);
            return;
        }
        const timer = setTimeout(() => setShowFallbackButton(true), 10_000);
        return () => clearTimeout(timer);
    }, [isWaitingForWebhook, isPaid]);

    useEffect(() => {
        if (isWaitingForWebhook && isPaid) {
            queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all });
            
            const timer = setTimeout(() => {
                setIsWaitingForWebhook(false);
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('virtuabogado_pending_order');
                    window.localStorage.removeItem('activeOrderId');
                }
                reset();
                router.push('/mis-servicios');
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isPaid, isWaitingForWebhook, router, reset, setIsWaitingForWebhook, queryClient]);

    const { data: methods, isLoading: isLoadingMethods } = usePaymentMethods();

    const handlePayment = async (paymentMethodId: string) => {
        if (isProcessingPayment) return;

        let checkoutWindow: Window | null = null;
        if (paymentMethodId === 'zenobank') {
            checkoutWindow = window.open('', '_blank');
        }

        setIsProcessingPayment(true);
        const loadingToast = toast.loading('Conectando con la pasarela financiera segura...');

        try {
            const result = await processPaymentAction({
                serviceId: service!.id,
                paymentMethodId
            });

            if (result.success) {
                if (result.order?.id) {
                    setOrderId(result.order.id);
                }

                if (result.redirectUrl) {
                    toast.success('Sesión de pago iniciada. Redirigiendo...', { id: loadingToast });
                    setIsWaitingForWebhook(true);
                    
                    if (checkoutWindow) {
                        checkoutWindow.location.href = result.redirectUrl;
                    } else {
                        window.location.href = result.redirectUrl;
                    }
                } else {
                    if (checkoutWindow) checkoutWindow.close();
                    toast.success('Solicitud procesada con éxito', { id: loadingToast });
                    setIsProcessingPayment(false);
                    setStep(3);
                }
            } else {
                if (checkoutWindow) checkoutWindow.close();
                toast.error(result.message || 'Error en el procesamiento', { id: loadingToast });
                setIsProcessingPayment(false);
            }
        } catch (error: any) {
            if (checkoutWindow) checkoutWindow.close();
            toast.error(error.message || 'Error en el procesamiento seguro', { id: loadingToast });
            setIsProcessingPayment(false);
        }
    };

    return {
        methods,
        isLoadingMethods,
        isWaitingForWebhook,
        isPaid,
        showFallbackButton,
        isProcessingPayment,
        setStep,
        handlePayment
    };
};
