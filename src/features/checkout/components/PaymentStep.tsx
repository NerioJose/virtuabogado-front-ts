'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiCreditCard, FiArrowRight, FiLoader, FiAlertCircle, FiLock, FiCheckCircle } from 'react-icons/fi';
import { SiBitcoin, SiVisa, SiMastercard, SiAmericanexpress } from 'react-icons/si';
import { FaCcPaypal } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useCheckout } from '../hooks/useCheckout';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { processPaymentAction } from '../actions/processPaymentAction';
import { toast } from 'sonner';
import { formatUSD } from '@/lib/finance';

export const PaymentStep: React.FC = () => {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { 
        service, 
        setStep, 
        total, 
        orderId,
        setOrderId,
        isProcessingPayment, 
        setIsProcessingPayment,
        isWaitingForWebhook,
        setIsWaitingForWebhook,
        markAsCompleted,
        reset
    } = useCheckout();

    // Requisito Fintech: Persistencia de Sesión
    // Si la sesión expira o el usuario recarga, recuperamos la orden de localStorage
    useEffect(() => {
        if (orderId) {
            localStorage.setItem('virtuabogado_pending_order', orderId);
        } else if (isWaitingForWebhook) {
            const savedOrder = localStorage.getItem('virtuabogado_pending_order');
            if (savedOrder) setOrderId(savedOrder);
        }
    }, [orderId, isWaitingForWebhook, setOrderId]);

    // Polling de Estado: TanStack Query con refetchInterval de 3s
    // staleTime:0 garantiza que siempre consulta el servidor (sin caché)
    const { data: statusData } = useOrderStatus(orderId, isWaitingForWebhook);

    // Sincronización de Estado via Polling (Backup de Realtime)
    // Cambiamos el estado visual si la orden se confirma en segundo plano
    useEffect(() => {
        if (!statusData) return;
        const currentStatus = statusData?.status?.trim().toUpperCase();
        
        if (currentStatus === 'PAID') {
            console.log('✨ [PaymentStep] Pago detectado via polling. Sincronizando UI...');
            // No hacemos redirect duro aquí para permitir que el Broadcast (Realtime) 
            // maneje la "emisión" principal de forma fluida, o que el usuario vea el éxito.
        } else if (currentStatus === 'ERROR') {
            toast.error('El pago no pudo ser completado. Por favor, intenta de nuevo.');
            setIsWaitingForWebhook(false);
        }
    }, [statusData?.status, setIsWaitingForWebhook]);

    const { data: methods, isLoading: isLoadingMethods } = usePaymentMethods();

    const handlePayment = async (paymentMethodId: string) => {
        if (isProcessingPayment) return;

        // --- APERTURA SIMPLE (SIN NOMBRES NI COMPLICACIONES) ---
        // Abrimos la pestaña al instante para que el navegador no la bloquee.
        let checkoutWindow: Window | null = null;
        if (paymentMethodId === 'zenobank') {
            checkoutWindow = window.open('', '_blank');
        }

        setIsProcessingPayment(true);
        const loadingToast = toast.loading('Preparando conexión segura...');

        try {
            const result = await processPaymentAction({
                serviceId: service!.id,
                paymentMethodId
            });

            if (result.success) {
                // Guardamos el orderId en el store para el polling
                if (result.order?.id) {
                    setOrderId(result.order.id);
                }

                if (result.redirectUrl) {
                    toast.success('Abriendo pasarela...', { id: loadingToast });
                    
                    if (checkoutWindow) {
                        // Simplemente asignamos la dirección a la pestaña ya abierta
                        checkoutWindow.location.href = result.redirectUrl;
                        setIsWaitingForWebhook(true);
                    } else {
                        // Fallback si la apertura inicial falló
                        window.location.href = result.redirectUrl;
                    }
                } else {
                    if (checkoutWindow) checkoutWindow.close();
                    toast.success('Solicitud procesada con éxito', { id: loadingToast });
                    setStep(3); // Confirmación
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

    if (isLoadingMethods) {
        return (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-azul-primario/10 border-t-azul-primario rounded-full animate-spin"></div>
                    <FiShield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-azul-primario" size={24} />
                </div>
                <div className="text-center">
                    <p className="text-azul-primario font-bold text-lg animate-pulse tracking-tight">Sincronizando pasarelas...</p>
                    <p className="text-gray-400 text-sm mt-1">Verificación Zero-Trust en curso.</p>
                </div>
            </div>
        );
    }

    // --- ESTADO: ESPERANDO WEBHOOK (Pantalla Original) ---
    if (isWaitingForWebhook) {
        const isPaid = statusData?.status?.trim().toUpperCase() === 'PAID';

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-8"
            >
                <div className="relative w-24 h-24 mx-auto">
                    {isPaid ? (
                        <motion.div 
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           className="absolute inset-0 bg-green-50 rounded-full flex items-center justify-center border-4 border-green-500"
                        >
                            <FiShield className="text-green-600" size={32} />
                        </motion.div>
                    ) : (
                        <>
                            <div className="absolute inset-0 border-4 border-azul-primario/10 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
                            <FiShield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-azul-primario" size={32} />
                        </>
                    )}
                </div>

                <div className="space-y-3">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                        {isPaid ? '¡Pago Confirmado!' : 'Esperando confirmación...'}
                    </h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-balance leading-relaxed text-sm">
                        {isPaid 
                            ? 'Tu pago ha sido validado correctamente. Redirigiendo a tu panel...' 
                            : 'He abierto la pasarela en una nueva pestaña. Por favor, completa allí el pago para continuar.'}
                    </p>
                </div>

                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    {isPaid ? (
                        <button
                            onClick={() => window.location.href = '/mis-servicios'}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-green-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            Ir a mis servicios
                            <FiArrowRight size={20} />
                        </button>
                    ) : (
                        <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 flex flex-col items-center justify-center text-center space-y-2">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
                                <FiShield className="text-green-600" size={16} />
                            </div>
                            <p className="text-xs text-green-700 font-bold uppercase tracking-wider">Verificación Activa</p>
                            <p className="text-[10px] text-green-600 font-medium">No cierres esta pestaña. Te redirigiremos automáticamente.</p>
                        </div>
                    )}
                    
                    {!isPaid && (
                        <>
                            <button
                                onClick={() => {
                                    setIsWaitingForWebhook(false);
                                    setIsProcessingPayment(false);
                                }}
                                className="py-3 text-gray-400 hover:text-azul-primario text-xs font-bold transition-all uppercase tracking-widest"
                            >
                                ← Volver a métodos de pago
                            </button>
                            
                            <button
                                onClick={() => reset()}
                                className="text-[10px] text-gray-300 hover:text-red-400 uppercase font-bold transition-colors"
                            >
                                Cancelar Proceso
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        );
    }

    // --- ESTADO DE MANTENIMIENTO (0 Pasarelas) ---
    if (!methods || methods.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-12 px-6 text-center space-y-6"
            >
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto border-2 border-amber-100 mb-2">
                    <FiAlertCircle className="text-amber-500" size={40} />
                </div>
                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-gray-800 tracking-tight">Pagos en Mantenimiento</h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-balance leading-relaxed">
                        Estamos optimizando nuestros sistemas de cobro. Por favor, intenta de nuevo en unos minutos.
                    </p>
                </div>
                <button
                    onClick={() => setStep(1)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-8 py-3 rounded-xl transition-all"
                >
                    Volver Atrás
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
        >
            <div className="bg-azul-claro/20 p-4 rounded-2xl flex items-start gap-4 border border-azul-claro/30 shadow-inner">
                <div className="bg-azul-primario/10 p-2 rounded-xl">
                    <FiLock className="text-azul-primario" size={24} />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-azul-primario leading-relaxed font-bold uppercase tracking-widest mb-0.5">
                        Conexión Blindada (SSL)
                    </p>
                    <p className="text-[10px] text-azul-primario/60 leading-tight">
                        Tus datos financieros viajan encriptados bajo el estándar industrial <span className="font-bold">AES-256 bits</span>. VirtuAbogado no almacena tus datos bancarios.
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                    {methods.length === 1 ? 'Pasarela Recomendada' : 'Métodos de Pago Disponibles'}
                </p>

                {methods.map((method: any) => (
                    <button
                        key={method.id}
                        onClick={() => handlePayment(method.identifier)}
                        disabled={isProcessingPayment}
                        className={`w-full group flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md ${
                            methods.length === 1 
                                ? 'border-azul-primario bg-azul-claro/5' 
                                : 'border-gray-100 hover:border-azul-primario hover:bg-azul-claro/10'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-50 flex items-center justify-center text-azul-primario group-hover:scale-110 transition-transform">
                                {method.identifier === 'zenobank' ? (
                                    <SiBitcoin size={24} className="text-[#f7931a]" />
                                ) : (
                                    <FiCreditCard size={24} />
                                )}
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-azul-primario text-lg leading-tight">{method.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Procesamiento Blindado • HMAC Secured</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {methods.length === 1 && <span className="text-[10px] font-black text-azul-primario uppercase bg-azul-claro px-2 py-1 rounded-md">Pagar Ahora</span>}
                            <FiArrowRight className="text-gray-300 group-hover:text-azul-primario group-hover:translate-x-1 transition-all" size={20} />
                        </div>
                    </button>
                ))}
            </div>

            {/* Resumen Final & Trust Badges */}
            <div className="border-t border-gray-100 pt-6 mt-6">
                <div className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm mb-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Monto a Liquidar</span>
                        <span className="text-gray-500 font-medium text-xs flex items-center gap-1 italic">
                            <FiCheckCircle className="text-green-500" /> Todo incluido
                        </span>
                    </div>
                    <div className="text-right">
                        <span className="text-4xl font-black text-azul-primario tracking-tighter">
                            {formatUSD(total, 2)}
                        </span>
                        {methods?.some((m: any) => m.identifier === 'zenobank') && (
                            <p className="text-[9px] text-amber-600 font-bold uppercase tracking-tighter mt-1">
                                * Precisión Cripto requerida en pasarela
                            </p>
                        )}
                    </div>
                </div>

                {/* Zenobank/Crypto Critical Alert */}
                {methods?.some((m: any) => m.identifier === 'zenobank') && (
                    <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3 shadow-sm"
                    >
                        <div className="bg-amber-100 p-2 rounded-xl animate-pulse">
                            <FiAlertCircle className="text-amber-600" size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-1">Aviso Importante: Pagos Cripto</p>
                            <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                Para evitar retrasos en tu activación, al abrirse la pasarela de <span className="font-bold">Zenobank</span>, debes transferir el monto <span className="font-bold text-amber-800 underline uppercase">exacto</span> indicado (incluyendo todos los decimales). Zenobank aplica una tasa mínima que debe ser cubierta con exactitud.
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* Trust Badges Bar */}
                <div className="flex flex-col items-center gap-4 py-4 px-2 border border-gray-100 rounded-2xl mb-6 bg-gray-50/30">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Pasarelas Seguras & Trust Badges</p>
                    <div className="flex items-center justify-center gap-6 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                        <SiVisa size={28} title="Visa" />
                        <SiMastercard size={28} title="Mastercard" />
                        <SiAmericanexpress size={26} title="Amex" />
                        <FaCcPaypal size={28} title="PayPal" />
                        <SiBitcoin size={24} title="Bitcoin/Crypto" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest border border-green-100">
                        <FiShield size={12} /> Pago Garantizado & Protegido
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isProcessingPayment}
                    className="w-full py-3 text-gray-400 hover:text-azul-primario text-[10px] font-black transition-all uppercase tracking-[0.2em] hover:bg-azul-claro/5 rounded-xl flex items-center justify-center gap-2"
                >
                    ← Modificar mis datos personales
                </button>
            </div>
        </motion.div>
    );
};
