'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiLoader, FiCreditCard, FiAlertTriangle } from 'react-icons/fi';
import { useMercadoPago } from '../hooks/useMercadoPago';
import { cleanupCheckoutAfterPayment } from '../utils/checkoutCleanup';
import { toast } from 'sonner';

interface MercadoPagoCardStepProps {
    orderId: string;
    amountUsd: number;
    amountPen: number;
    payerEmail?: string;
}

export const MercadoPagoCardStep: React.FC<MercadoPagoCardStepProps> = ({
    orderId,
    amountUsd,
    amountPen,
    payerEmail,
}) => {
    const { sdkReady, loadError, mountCardBrick, unmountCardBrick, loadSecurityScript } = useMercadoPago();
    const [isProcessing, setIsProcessing] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [bin, setBin] = useState<string>('');
    const mountedRef = React.useRef(true);
    const hasMountedRef = React.useRef(false);
    const brickContainerRef = React.useRef<HTMLDivElement | null>(null);
    const handleSubmitRef = React.useRef<((formData: any) => Promise<void>) | null>(null);

    // Cargar el security.js de MP (Device ID) al montar el checkout de tarjeta.
    useEffect(() => {
        loadSecurityScript();
    }, [loadSecurityScript]);

    // Desmontar el Brick solo cuando el componente se desmonta de verdad (no en re-renders).
    // IMPORTANTE: se restaura mountedRef a true en el cuerpo para que React StrictMode
    // (mount -> cleanup -> mount en dev) no lo deje en false, lo que bloqueaba handleSubmit.
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            unmountCardBrick();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // handleSubmit vive fuera del useEffect (en el cuerpo del componente) y se
    // guarda en un ref. El Brick usa un onSubmit estable que lee del ref, de modo
    // que los re-renders no re-montan el Brick ni pierden el token al pagar.
    const handleSubmit = async (formData: any) => {
        setIsProcessing(true);

        try {
            const token = formData?.token;
            // NO usar 'card' como fallback: no es un payment_method_id válido de MP
            // (los válidos son 'visa', 'master', etc.). MP infiere el método del token.
            const paymentMethodId = formData?.payment_method_id;
            const paymentTypeId = formData?.payment_type_id;
            const issuerId = formData?.issuer_id;
            // NOTA: NO se reenvía payer.identification. El token del Brick ya lleva
            // la identificación del cardholder incrustada; enviarla de nuevo en el
            // payer del pago hace que MP responda 1004 "Invalid parameters for
            // payment_method API".

            if (!token) {
                throw new Error('No se pudo generar el token de la tarjeta.');
            }

            // Device ID (MP_DEVICE_SESSION_ID) lo genera el security.js / JS SDK.
            const deviceId =
                (typeof window !== 'undefined' && (window as any).MP_DEVICE_SESSION_ID)
                    ? String((window as any).MP_DEVICE_SESSION_ID)
                    : '';

            const res = await fetch('/api/payments/mercadopago', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    paymentToken: token,
                    paymentMethodId,
                    paymentTypeId,
                    issuerId,
                    deviceId: deviceId || undefined,
                    bin: bin || undefined,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg =
                    data?.error ||
                    (data?.error?.message) ||
                    'Error al procesar el pago. Verifique su tarjeta e intente de nuevo.';
                throw new Error(msg);
            }

            const finalStatus = data?.paymentStatus;

            // Pesimista: solo tras la respuesta de MP se decide el resultado y se
            // navega a la página correspondiente (success/error), igual que Zenobank.
            // El evento order.payment_received ya fue emitido server-side en 'approved'
            // (asignación de caso idéntica a Zenobank); la página /payment/success
            // confirma el estado final y redirige al panel.
            setIsRedirecting(true);
            cleanupCheckoutAfterPayment();

            if (finalStatus === 'approved') {
                window.location.href = `/payment/success?orderId=${encodeURIComponent(orderId)}`;
            } else if (finalStatus === 'rejected' || finalStatus === 'cancelled' || finalStatus === 'charged_back') {
                const detail = data?.errorDetail || data?.status_detail || 'Tarjeta rechazada';
                window.location.href = `/payment/error?orderId=${encodeURIComponent(orderId)}&error=${encodeURIComponent(detail)}`;
            } else {
                // pending / in_process / respuesta inesperada: la página /payment/success
                // hará polling del estado hasta que MP confirme (aprobado/rechazado).
                window.location.href = `/payment/success?orderId=${encodeURIComponent(orderId)}`;
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al procesar el pago');
            setIsProcessing(false);
            setIsRedirecting(false);
        }
    };

    // Mantener el ref al día con el handleSubmit más reciente.
    handleSubmitRef.current = handleSubmit;

    // Montar el Brick UNA sola vez: cuando el SDK y el monto estén listos y el
    // contenedor exista. El guard hasMountedRef evita re-montajes por cualquier
    // re-render (estado realtime, timers, re-render del padre, etc.).
    useEffect(() => {
        if (!sdkReady || !orderId) return;
        if (!(amountPen > 0)) {
            setLocalError('No se pudo calcular el monto del pago en soles (S/). Intente de nuevo.');
            return;
        }
        if (!brickContainerRef.current) return;
        if (hasMountedRef.current) return;
        hasMountedRef.current = true;

        const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';
        const onSubmit = (formData: any) => handleSubmitRef.current?.(formData);
        const onBinChange = (value: string) => {
            setBin(value || '');
        };

        mountCardBrick({ container: 'card-payment-brick', publicKey, amountPen, orderId, payerEmail, onSubmit, onBinChange }).catch(
            (e) => {
                console.error('[MercadoPago] mount error:', e);
                if (mountedRef.current) {
                    setLocalError(e?.message || 'No se pudo iniciar el pago con tarjeta.');
                }
            }
        );
        // Dependencias mínimas: solo lo necesario para montar el brick una vez.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sdkReady, orderId, amountPen]);

    if (isRedirecting) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-4"
            >
                <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 border-4 border-azul-primario/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
                    <FiCreditCard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-azul-primario" size={24} />
                </div>
                <h3 className="text-lg font-black text-gray-900">Procesando resultado del pago...</h3>
                <p className="text-sm text-gray-500">Validando la confirmación de la pasarela. Un momento por favor.</p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
        >
            <div className="flex flex-wrap items-start justify-between gap-3 p-4 bg-azul-claro/10 rounded-2xl border border-azul-claro/20">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-azul-primario border border-gray-100 flex-shrink-0">
                        <FiCreditCard size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                            Pago con Tarjeta · Crédito o Débito
                        </p>
                        <p className="text-lg font-black text-azul-primario leading-tight break-words">
                            S/ {amountPen.toFixed(2)} <span className="text-xs text-gray-400 font-bold">(≈ USD {amountUsd.toFixed(2)})</span>
                        </p>
                    </div>
                </div>
                {isProcessing && (
                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <span className="text-xs font-bold text-azul-primario uppercase tracking-wider">Procesando</span>
                        <FiLoader className="animate-spin text-azul-primario" size={20} />
                    </div>
                )}
            </div>

            {loadError || localError ? (
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <FiAlertTriangle className="text-red-500 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-red-600">No se pudo iniciar el pago</p>
                        <p className="text-xs text-red-500 mt-1">{localError || loadError}</p>
                    </div>
                </div>
            ) : sdkReady ? (
                <div id="card-payment-brick" ref={brickContainerRef} className="min-h-[300px]" />
            ) : (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <FiLoader className="animate-spin text-azul-primario" size={28} />
                    <p className="text-sm text-gray-500 font-medium">Preparando pago seguro con tarjeta...</p>
                </div>
            )}
        </motion.div>
    );
};
