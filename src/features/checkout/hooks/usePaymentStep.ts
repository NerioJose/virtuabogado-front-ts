import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useCheckout } from '../hooks/useCheckout';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { processPaymentAction } from '../actions/processPaymentAction';
import { cleanupCheckoutAfterPayment } from '../utils/checkoutCleanup';
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

    const mountedRef = useRef(true);

    useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    const [showFallbackButton, setShowFallbackButton] = useState(false);
    const [activeMercadoPago, setActiveMercadoPago] = useState<{
        orderId: string;
        amountUsd: number;
        amountPen: number;
        payerEmail?: string;
        mode?: 'card' | 'yape';
    } | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

    const selectMethod = (identifier: string) => {
        setSelectedMethod(identifier);
    };

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

                // MERCADOPAGO (inline): tarjeta (Brick) o Yape (celular+OTP).
                // Ambos muestran un paso embebido; solo cambia el componente final.
                const inlineFlow = (result as any)?.mercadopago || (result as any)?.yape;
                if (inlineFlow && result.order?.id) {
                    const isYape = !!(result as any)?.yape;
                    toast.success(
                        isYape ? 'Complete el pago con Yape.' : 'Complete el pago con su tarjeta.',
                        { id: loadingToast }
                    );
                    try {
                        const amountRes = await fetch(
                            `/api/payments/mercadopago?orderId=${result.order.id}`,
                            { cache: 'no-store' }
                        );
                        const amountData = await amountRes.json().catch(() => ({}));
                        if (!amountRes.ok) {
                            throw new Error(amountData?.error || 'No se pudo calcular el monto del pago.');
                        }
                        const amountPen = Number(amountData?.amountPen ?? 0);
                        const amountUsd = Number(amountData?.amountUsd ?? 0);
                        if (!(amountPen > 0)) {
                            throw new Error('No se pudo calcular el monto del pago en soles (S/). Intente de nuevo.');
                        }
                        setActiveMercadoPago({
                            orderId: result.order.id,
                            amountUsd,
                            amountPen,
                            payerEmail: amountData?.payerEmail || '',
                            mode: isYape ? 'yape' : 'card',
                        });
                    } catch (e: any) {
                        setIsProcessingPayment(false);
                        if (checkoutWindow) checkoutWindow.close();
                        toast.error(e?.message || 'No se pudo calcular el monto del pago.', { id: loadingToast });
                        return;
                    }
                    setIsProcessingPayment(false);
                    if (checkoutWindow) checkoutWindow.close();
                    return;
                }

                if (result.redirectUrl) {
                    toast.success('Sesión de pago iniciada. Redirigiendo...', { id: loadingToast });
                    setIsWaitingForWebhook(true);
                    // Limpiar el checkout para que no se reabra al volver de la pasarela.
                    cleanupCheckoutAfterPayment();

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

    const handleMercadoPagoRedirect = useCallback((paidOrderId: string) => {
        // MP ahora redirige a /payment/success|error desde el propio MercadoPagoCardStep.
        // Este helper se mantiene por si algún flujo requiere volver a la espera.
        setOrderId(paidOrderId);
        setActiveMercadoPago(null);
    }, [setOrderId, setActiveMercadoPago]);

    return {
        methods,
        isLoadingMethods,
        isWaitingForWebhook,
        isPaid,
        showFallbackButton,
        isProcessingPayment,
        activeMercadoPago,
        selectedMethod,
        selectMethod,
        setStep,
        handlePayment,
        handleMercadoPagoRedirect,
    };
};
