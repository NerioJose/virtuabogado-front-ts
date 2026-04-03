'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    useEffect(() => {
        if (orderId) {
            localStorage.setItem('virtuabogado_pending_order', orderId);
        } else if (isWaitingForWebhook) {
            const savedOrder = localStorage.getItem('virtuabogado_pending_order');
            if (savedOrder) setOrderId(savedOrder);
        }
    }, [orderId, isWaitingForWebhook, setOrderId]);

    // Polling de Estado
    const { data: statusData } = useOrderStatus(orderId, isWaitingForWebhook);

    // Sincronización de Estado
    useEffect(() => {
        if (!statusData) return;
        const currentStatus = statusData?.status?.trim().toUpperCase();
        
        if (currentStatus === 'PAID') {
            console.log('✨ [PaymentStep] Pago detectado via polling. Sincronizando UI...');
        } else if (currentStatus === 'ERROR') {
            toast.error('El pago no pudo ser completado. Por favor, intenta de nuevo.');
            setIsWaitingForWebhook(false);
        }
    }, [statusData?.status, setIsWaitingForWebhook]);

    const { data: methods, isLoading: isLoadingMethods } = usePaymentMethods();

    const handlePayment = async (paymentMethodId: string) => {
        if (isProcessingPayment) return;

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
                if (result.order?.id) {
                    setOrderId(result.order.id);
                }

                if (result.redirectUrl) {
                    toast.success('Abriendo pasarela...', { id: loadingToast });
                    
                    if (checkoutWindow) {
                        checkoutWindow.location.href = result.redirectUrl;
                        setIsWaitingForWebhook(true);
                    } else {
                        window.location.href = result.redirectUrl;
                    }
                } else {
                    if (checkoutWindow) checkoutWindow.close();
                    toast.success('Solicitud procesada con éxito', { id: loadingToast });
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
            {/* --- BLOQUE: CONEXIÓN BLINDADA (GLASSMORPHISM PREMIUM) --- */}
            <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-white/40 backdrop-blur-xl p-5 rounded-[2.5rem] flex items-center gap-5 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] group"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-azul-primario/[0.02] to-transparent pointer-events-none" />
                <div className="relative bg-azul-primario/10 p-3 rounded-2xl shadow-inner border border-azul-primario/5">
                    <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <FiLock className="text-azul-primario" size={26} />
                    </motion.div>
                </div>
                <div className="relative flex-1">
                    <p className="text-[11px] text-azul-primario leading-relaxed font-black uppercase tracking-[0.15em] mb-0.5 flex items-center gap-2">
                        Conexión Blindada (HSTS)
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight font-medium">
                        Tus datos financieros viajan encriptados bajo el estándar industrial <span className="font-bold text-slate-700">AES-256 bits</span>. VirtuAbogado no almacena datos bancarios.
                    </p>
                </div>
            </motion.div>

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

                {/* --- ALERTA TÁCTICA: PRECISIÓN CRIPTO ZENOBANK --- */}
                {methods?.some((m: any) => m.identifier === 'zenobank') && (
                    <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="mb-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-[2.5rem] flex items-start gap-5 shadow-sm relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <SiBitcoin size={60} />
                        </div>
                        <div className="bg-amber-100 p-3 rounded-2xl shadow-inner border border-amber-200">
                            <motion.div
                                animate={{ rotate: [0, -10, 10, 0] }}
                                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
                            >
                                <FiAlertCircle className="text-amber-600" size={28} />
                            </motion.div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <p className="text-[11px] font-black text-amber-800 uppercase tracking-[0.15em] flex items-center gap-2">
                                <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                                REQUISITO: PRECISIÓN DECIMAL
                            </p>
                            <p className="text-[10px] text-amber-800/80 leading-relaxed font-medium">
                                Para evitar que tu activación sea rechazada, al abrirse <span className="font-bold text-amber-900">Zenobank</span>, debes transferir el monto <span className="font-black text-amber-900 underline underline-offset-4 decoration-2 decoration-amber-500">EXACTO</span> indicado:
                            </p>
                            <div className="bg-white/60 p-3 rounded-xl border border-amber-200/50 flex justify-between items-center group-hover:bg-white transition-colors">
                                <span className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Importe requerido:</span>
                                <span className="text-xl font-mono font-black text-amber-900 tracking-tighter">
                                    {formatUSD(total, 2)}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* --- BARRA DE CONFIANZA: SEGURIDAD GARANTIZADA --- */}
                <div className="flex flex-col items-center gap-6 py-8 px-4 border border-slate-100 rounded-[2.5rem] mb-8 bg-slate-50/30 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-azul-primario/5 to-transparent" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mb-2">Pasarelas Seguras & Trust Badges</p>
                    <div className="flex items-center justify-center gap-8 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                        <SiVisa size={32} />
                        <SiMastercard size={32} />
                        <SiAmericanexpress size={30} />
                        <FaCcPaypal size={32} />
                        <SiBitcoin size={28} />
                    </div>
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border border-emerald-100/50 shadow-sm">
                        <FiCheckCircle className="animate-pulse" /> Pago Garantizado & Encriptado
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
