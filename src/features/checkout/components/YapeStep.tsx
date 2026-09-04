'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiLoader, FiAlertTriangle, FiSmartphone, FiShield } from 'react-icons/fi';
import Image from 'next/image';
import { cleanupCheckoutAfterPayment } from '../utils/checkoutCleanup';
import { toast } from 'sonner';

interface YapeStepProps {
    orderId: string;
    amountUsd: number;
    amountPen: number;
    payerEmail?: string;
}

/**
 * Paso de pago con Yape (Checkout API — celular + OTP embebido).
 *
 * Flujo:
 *  1. El usuario ve el monto y un formulario de celular + OTP.
 *  2. Se generan las instrucciones para obtener el código de aprobación en Yape.
 *  3. Con celular + OTP se genera el token Yape (mp.yape.create) y se crea el pago
 *     en /api/payments/yape.
 *  4. Según la respuesta de MP se redirige a /payment/success|error (pesimista).
 */
export const YapeStep: React.FC<YapeStepProps> = ({
    orderId,
    amountUsd,
    amountPen,
    payerEmail,
}) => {
    const [sdkReady, setSdkReady] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const mountedRef = React.useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Cargar el SDK JS de MercadoPago una sola vez (necesario para mp.yape.create).
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.MercadoPago) {
            setSdkReady(true);
            return;
        }

        const existing = document.getElementById('mp-sdk');
        if (existing && existing.getAttribute('data-load-state') === 'loaded') {
            setSdkReady(true);
            return;
        }

        const script = document.createElement('script');
        script.id = 'mp-sdk';
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => setSdkReady(true);
        script.onerror = () => setLocalError('No se pudo cargar el SDK de pago. Intente de nuevo.');
        script.setAttribute('data-load-state', 'loading');
        document.head.appendChild(script);
    }, []);

    const validatePhone = (value: string) => /^9\d{8}$/.test(value.trim());
    const validateOtp = (value: string) => /^\d{6}$/.test(value.trim());

    const handlePay = async () => {
        if (isProcessing) return;
        setLocalError(null);

        const phoneClean = phone.trim();
        const otpClean = otp.trim();

        if (!validatePhone(phoneClean)) {
            setLocalError('Ingresa un número de celular válido (9 dígitos, empieza en 9).');
            return;
        }
        if (!validateOtp(otpClean)) {
            setLocalError('Ingresa el código de aprobación de 6 dígitos.');
            return;
        }
        if (!window.MercadoPago) {
            setLocalError('El SDK de pago aún no está listo. Intenta de nuevo.');
            return;
        }

        setIsProcessing(true);

        try {
            const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';
            const mp = new window.MercadoPago(publicKey);
            const yape = mp.yape({ otp: otpClean, phoneNumber: phoneClean });
            const yapeToken = await yape.create();

            if (!yapeToken?.id && !yapeToken?.token) {
                throw new Error('No se pudo generar el token de Yape. Verifica tu celular y código.');
            }
            const tokenValue = yapeToken?.token || yapeToken?.id;

            // Device ID (X-meli-session-id) para mejorar la evaluación antifraude.
            const deviceId =
                (typeof window !== 'undefined' && (window as any).MP_DEVICE_SESSION_ID)
                    ? String((window as any).MP_DEVICE_SESSION_ID)
                    : '';

            const res = await fetch('/api/payments/yape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    yapeToken: tokenValue,
                    deviceId: deviceId || undefined,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                const msg =
                    data?.error ||
                    (data?.error?.message) ||
                    'Error al procesar el pago con Yape. Intente de nuevo.';
                throw new Error(msg);
            }

            const finalStatus = data?.paymentStatus;

            cleanupCheckoutAfterPayment();

            if (finalStatus === 'approved') {
                window.location.href = `/payment/success?orderId=${encodeURIComponent(orderId)}`;
            } else if (finalStatus === 'rejected' || finalStatus === 'cancelled' || finalStatus === 'charged_back') {
                const detail = data?.statusDetail || data?.errorDetail || 'Pago rechazado';
                window.location.href = `/payment/error?orderId=${encodeURIComponent(orderId)}&error=${encodeURIComponent(detail)}`;
            } else {
                // pending/in_process o respuesta inesperada: la página success hace polling.
                window.location.href = `/payment/success?orderId=${encodeURIComponent(orderId)}`;
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error al procesar el pago con Yape');
            setIsProcessing(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
        >
            {/* Monto */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-azul-claro/10 rounded-2xl border border-azul-claro/20">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 flex-shrink-0">
                        <Image src="/images/yape-logo.png" alt="Yape" width={24} height={24} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                            Pago con Yape
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

            {/* Instrucciones para obtener el código de aprobación */}
            <div className="p-4 bg-yellow-50/60 rounded-2xl border border-yellow-200/70 space-y-2">
                <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.15em] flex items-center gap-2">
                    <FiSmartphone className="text-amber-600" />
                    ¿Cómo obtener tu código de aprobación?
                </p>
                <ol className="list-decimal list-inside text-xs text-gray-700 space-y-1 leading-relaxed">
                    <li>Ve a tu celular <span className="font-bold text-gray-900">Yape</span>.</li>
                    <li>En tu menú Yape, haz clic en <span className="font-bold text-gray-900">"Código de aprobación"</span>.</li>
                    <li>Pega el código en el campo <span className="font-bold text-gray-900">"Código de aprobación"</span>.</li>
                    <li>Finaliza el pago.</li>
                </ol>
            </div>

            {/* Formulario celular + OTP */}
            <div className="space-y-3">
                <div>
                    <label htmlFor="yape-phone" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Número de celular
                    </label>
                    <input
                        id="yape-phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={9}
                        placeholder="9XXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-azul-primario focus:ring-2 focus:ring-azul-primario/20 outline-none text-gray-900 disabled:opacity-50"
                    />
                </div>
                <div>
                    <label htmlFor="yape-otp" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Código de aprobación
                    </label>
                    <input
                        id="yape-otp"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="••••••"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        disabled={isProcessing}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-azul-primario focus:ring-2 focus:ring-azul-primario/20 outline-none text-gray-900 tracking-[0.3em] text-center font-mono text-lg disabled:opacity-50"
                    />
                </div>
            </div>

            {localError && (
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                    <FiAlertTriangle className="text-red-500 mt-0.5" />
                    <p className="text-xs text-red-600 font-medium">{localError}</p>
                </div>
            )}

            <button
                type="button"
                onClick={handlePay}
                disabled={isProcessing || !sdkReady}
                className="w-full py-4 rounded-2xl bg-azul-primario text-white font-bold shadow-lg shadow-azul-primario/25 hover:bg-azul-oscuro transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isProcessing ? (
                    <>
                        <FiLoader className="animate-spin" />
                        <span>Procesando pago...</span>
                    </>
                ) : (
                    <>
                        <Image src="/images/yape-logo.png" alt="" width={20} height={20} className="opacity-90" />
                        <span>Pagar con Yape</span>
                    </>
                )}
            </button>

            <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <FiShield className="text-azul-primario" />
                Pago seguro procesado por Mercado Pago
            </div>
        </motion.div>
    );
};
