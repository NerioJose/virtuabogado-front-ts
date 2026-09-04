'use client';

import { use, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiXCircle, FiRefreshCw, FiArrowLeft, FiAlertTriangle, FiCreditCard, FiLoader } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useOrder } from '@/features/orders/hooks/useOrders';
import { cleanupCheckoutAfterPayment } from '@/features/checkout/utils/checkoutCleanup';
import { useCheckoutStore } from '@/features/checkout/store/checkoutStore';
import { SiBitcoin } from 'react-icons/si';

export default function PaymentErrorPage({
    searchParams
}: {
    searchParams: Promise<{ orderId: string, error?: string }>
}) {
    const { orderId, error } = use(searchParams);
    const router = useRouter();
    const { data: order, isLoading, isError } = useOrder(orderId);

    const isCard = order?.paymentMethodIdentifier === 'mercadopago';
    const isYape = order?.paymentMethodIdentifier === 'yape';

    // Mapeo de status_detail de MercadoPago a mensajes claros y accionables.
    const getCardErrorMessage = (raw?: string): string => {
        const code = (raw || '').trim();
        const messages: Record<string, string> = {
            cc_rejected_insufficient_amount: 'Tu tarjeta no tiene fondos suficientes para completar el pago. Verifica tu saldo o usa otra tarjeta.',
            cc_rejected_bad_filled_card_number: 'El número de tarjeta ingresado es incorrecto. Verifícalo e inténtalo de nuevo.',
            cc_rejected_bad_filled_security_code: 'El código de seguridad (CVV) es incorrecto. Verifícalo e inténtalo de nuevo.',
            cc_rejected_bad_filled_expiration_date: 'La fecha de vencimiento de tu tarjeta es incorrecta. Verifícala e inténtalo de nuevo.',
            cc_rejected_bad_filled_other: 'Revisa que todos los datos de tu tarjeta sean correctos e inténtalo de nuevo.',
            cc_rejected_card_disabled: 'Tu tarjeta no está habilitada para pagos por internet. Contacta a tu banco.',
            cc_rejected_card_disabled_for_installments: 'Tu tarjeta no permite este tipo de pago. Prueba con otra tarjeta o método.',
            cc_rejected_card_expired: 'Tu tarjeta está vencida. Usa otra tarjeta.',
            cc_rejected_high_risk: 'El pago no pudo ser aprobado por políticas de seguridad. Prueba con otro método de pago.',
            cc_rejected_max_attempts: 'Se superó el número de intentos permitidos. Inténtalo nuevamente en unos minutos.',
            cc_rejected_call_for_authorize: 'Tu banco requiere autorización para este pago. Contacta a tu banco e inténtalo de nuevo.',
            cc_rejected_duplicated_payment: 'Ya existe un pago por este importe. Verifica tu estado de cuenta o espera la confirmación.',
            cc_rejected_card_not_supported: 'Tu tarjeta no es aceptada para este pago. Usa otra tarjeta o método.',
            cc_rejected_invalid_installments: 'El número de cuotas no es válido. Intenta con un pago en una sola cuota.',
            cc_rejected_blacklist: 'El pago no pudo ser procesado. Usa otro método de pago.',
            cc_rejected_other_reason: 'Tu banco rechazó el pago sin un motivo específico. Verifica los datos o usa otra tarjeta.',
            cc_amount_rate_limit_exceeded: 'Se superó el límite para este pago. Inténtalo más tarde.',
        };
        return messages[code] || (code ? `El pago fue rechazado (${code}). Verifica los datos de tu tarjeta e inténtalo de nuevo.` : '');
    };

    const cardDetailMessage = getCardErrorMessage(error);

    // Seguridad: al llegar a la página de error, el checkout no debe reabrirse
    // automáticamente (el usuario decide con el botón "Intentar con otro método").
    useEffect(() => {
        cleanupCheckoutAfterPayment();
    }, []);

    // "Intentar con otro método": reabre el checkout con el mismo servicio en el
    // paso 2 (listado de pasarelas de pago) para continuar la compra.
    const handleTryAnotherMethod = useCallback(() => {
        const svc = (order as any)?.service;
        if (!svc) {
            router.push('/servicios');
            return;
        }

        const servicio = {
            id: Number(svc.id),
            nombre: svc.titulo || 'Servicio Legal',
            titulo: svc.titulo || 'Servicio Legal',
            descripcion: svc.descripcion || '',
            precio: Number(svc.precio) || 0,
            duracion: svc.duracion || undefined,
            imagen: svc.imagenUrl || svc.imagen || undefined,
        };

        useCheckoutStore.getState().openCheckout(servicio as any);
        router.push('/servicios');
    }, [order, router]);

    // Mientras la orden carga, NO asumimos el método de pago (evita el "flash"
    // que mostraba el texto de Zenobank por defecto en pagos rechazados de tarjeta).
    if (isLoading && !order) {
        return (
            <main className="min-h-[80vh] flex items-center justify-center p-4">
                <FiLoader className="animate-spin text-azul-primario w-12 h-12" />
            </main>
        );
    }

    if (isError && !order) {
        return (
            <main className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="max-w-xl w-full text-center">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-amber-100">
                        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiAlertTriangle className="text-amber-600 w-12 h-12" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">
                            No pudimos verificar el estado de tu pago
                        </h1>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            Si tu pago fue exitoso, no te preocupes, tu servicio está siendo procesado.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button type="button"
                                onClick={() => router.push('/mis-servicios')}
                                className="btn-primary w-full py-4 rounded-xl transition shadow-md"
                            >
                                Ir a Mis Servicios
                            </button>
                            <Link href="/servicios">
                                <button type="button" className="w-full py-4 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition">
                                    Volver al catálogo
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-xl w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-red-50"
                >
                    {/* Brand */}
                    <div className="mb-8">
                        <Image
                            src="/logo/logo_sf_1.png"
                            alt="VirtuAbogado"
                            width={140}
                            height={40}
                            className="mx-auto"
                        />
                    </div>

                    {/* Animated Error Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.2 
                        }}
                        className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <FiXCircle className="text-red-600 w-12 h-12" />
                    </motion.div>

                    <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                        Error en el Pago
                    </h1>
                    
                    <p className="text-gray-600 mb-8 leading-relaxed max-w-sm mx-auto">
                        {isCard
                            ? 'Lo sentimos, no pudimos procesar el pago con tu tarjeta. No se ha realizado ningún cargo a tu cuenta.'
                            : isYape
                                ? 'Lo sentimos, no pudimos procesar el pago con Yape. No se ha realizado ningún cargo a tu cuenta.'
                                : 'Lo sentimos, Zenobank no pudo procesar tu transacción. No se ha realizado ningún cargo a tu cuenta.'}
                    </p>

                    {/* Error Details */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-red-50/50 rounded-2xl p-6 mb-8 text-left border border-red-100 flex items-start gap-4"
                    >
                        <div className="mt-1 flex-shrink-0">
                            {isCard ? (
                                <FiCreditCard className="text-red-500" size={24} />
                            ) : isYape ? (
                                <Image src="/images/yape-logo.png" alt="Yape" width={24} height={24} />
                            ) : (
                                <SiBitcoin className="text-red-500" size={24} />
                            )}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-red-800 mb-1 tracking-tight">Detalle del error:</p>
                            <p className="text-xs text-red-600 font-medium leading-relaxed">
                                {isCard
                                    ? (cardDetailMessage || 'La transacción con tu tarjeta fue rechazada o cancelada. Verifica los datos de tu tarjeta e intenta de nuevo.')
                                    : isYape
                                        ? (error || 'El pago con Yape fue rechazado o cancelado. Revisa tu celular Yape e intenta de nuevo.')
                                        : (error || 'La transacción fue rechazada o cancelada por el usuario. Por favor verifica tus fondos e intenta de nuevo.')}
                            </p>
                            <div className="mt-3">
                                <span className="text-[10px] text-red-400 font-mono">Ref: {orderId}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-4">
                        <button type="button"
                            onClick={handleTryAnotherMethod}
                            className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 bg-vinotinto/90 hover:bg-vinotinto transition"
                        >
                            <FiRefreshCw className="animate-spin-slow" />
                            Intentar con otro método de pago
                        </button>
                        
                        <Link href="/" className="text-sm text-gray-500 hover:text-azul-primario font-medium transition-colors flex items-center justify-center gap-2">
                            <FiArrowLeft />
                            Volver al inicio
                        </Link>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            Si el problema persiste, contacta con nuestro equipo de soporte técnico.
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
