'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiCreditCard, FiArrowRight, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { SiBitcoin } from 'react-icons/si';
import { useCheckout } from '../hooks/useCheckout';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { processPaymentAction } from '../actions/processPaymentAction';
import { toast } from 'sonner';
import { formatUSD } from '@/lib/finance';

export const PaymentStep: React.FC = () => {
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

    // --- LÓGICA DE DETECCIÓN AUTOMÁTICA (Polling) ---
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isWaitingForWebhook && orderId) {
            console.log(`📡 [UX] Iniciando monitoreo de orden: ${orderId}`);
            
            interval = setInterval(async () => {
                try {
                    const response = await fetch(`/api/orders/${orderId}`);
                    if (response.ok) {
                        const order = await response.json();
                        if (order.status === 'COMPLETADO' || order.status === 'SUCCESS') {
                            console.log('✅ [UX] ¡Pago confirmado vía Webhook! Redirigiendo...');
                            clearInterval(interval);
                            markAsCompleted();
                            setIsWaitingForWebhook(false);
                            setIsProcessingPayment(false);
                            setStep(3); // Ir a éxito
                        }
                    }
                } catch (err) {
                    console.error('❌ Error en el sondeo de la orden:', err);
                }
            }, 5000); // Cada 5 segundos
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isWaitingForWebhook, orderId, setStep, markAsCompleted, setIsWaitingForWebhook, setIsProcessingPayment]);

    const { data: methods, isLoading: isLoadingMethods } = usePaymentMethods();

    const handlePayment = async (paymentMethodId: string) => {
        if (isProcessingPayment) return;

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
                    toast.success('Abriendo pasarela en nueva pestaña...', { id: loadingToast });
                    
                    // --- REGLA UX: ABRIR EN PESTAÑA NUEVA (USER INITIATED) ---
                    const newWindow = window.open(result.redirectUrl, '_blank', 'noopener,noreferrer');
                    
                    if (newWindow) {
                        setIsWaitingForWebhook(true);
                    } else {
                        toast.error('El navegador bloqueó la ventana emergente. Por favor, permítela para continuar.', { id: loadingToast });
                        setIsProcessingPayment(false);
                    }
                } else {
                    toast.success('Solicitud procesada con éxito', { id: loadingToast });
                    setStep(3); // Confirmación
                }
            }
        } catch (error: any) {
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
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-12 text-center space-y-8"
            >
                <div className="relative w-24 h-24 mx-auto">
                    <div className="absolute inset-0 border-4 border-azul-primario/10 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
                    <FiShield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-azul-primario" size={32} />
                </div>

                <div className="space-y-3">
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Esperando confirmación...</h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-balance leading-relaxed text-sm">
                        He abierto la pasarela en una nueva pestaña. Por favor, completa allí el pago para continuar.
                    </p>
                </div>

                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <p className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1">Detección Automática</p>
                        <p className="text-[10px] text-green-600 font-medium">Esta ventana se actualizará sola cuando el pago sea procesado.</p>
                    </div>
                    
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
            <div className="bg-azul-claro/20 p-4 rounded-2xl flex items-start gap-3 border border-azul-claro/30">
                <FiShield className="text-azul-primario mt-1 flex-shrink-0" size={20} />
                <p className="text-sm text-azul-primario/80 leading-relaxed font-medium">
                    Arquitectura <span className="font-bold">Zero-Trust</span> activada. 
                    Redirecciones y validaciones blindadas en servidor.
                </p>
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

            {/* Resumen Final */}
            <div className="border-t border-gray-100 pt-6 mt-6">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <span className="text-gray-500 font-medium italic">Importe Total:</span>
                    <span className="text-3xl font-black text-azul-primario tracking-tighter">
                        {formatUSD(total)}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isProcessingPayment}
                    className="w-full mt-4 py-3 text-gray-400 hover:text-azul-primario text-xs font-bold transition-all uppercase tracking-widest hover:bg-gray-50 rounded-xl"
                >
                    ← Modificar mis datos
                </button>
            </div>
        </motion.div>
    );
};
