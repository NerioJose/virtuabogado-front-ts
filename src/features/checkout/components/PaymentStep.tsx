'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiCreditCard, FiArrowRight, FiLoader } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { processPaymentAction } from '../actions/processPaymentAction';
import { toast } from 'sonner';
import { formatUSD } from '@/lib/finance';

export const PaymentStep: React.FC = () => {
    const { service, setStep, total } = useCheckout();
    const { data: methods, isLoading: isLoadingMethods } = usePaymentMethods();
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasAttemptedAutoSelect, setHasAttemptedAutoSelect] = useState(false);

    // Lógica de Selector Inteligente: Si solo hay 1 activo, procesar automáticamente
    useEffect(() => {
        if (!isLoadingMethods && methods && methods.length === 1 && !hasAttemptedAutoSelect && !isProcessing) {
            console.log('🚀 [Zero-Trust] Único método activo detectado. Auto-seleccionando:', methods[0].name);
            handlePayment(methods[0].id);
            setHasAttemptedAutoSelect(true);
        }
    }, [methods, isLoadingMethods, hasAttemptedAutoSelect, isProcessing]);

    const handlePayment = async (paymentMethodId: string) => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        const loadingToast = toast.loading('Iniciando conexión segura con la pasarela...');
        
        try {
            // Validación Zero-Trust: Enviamos solo el IDs, el backend valida el precio
            const result = await processPaymentAction({ 
                serviceId: service!.id, 
                paymentMethodId 
            });
            
            if (result.success) {
                if (result.redirectUrl) {
                    toast.success('Redirigiendo a pasarela segura...', { id: loadingToast });
                    window.location.href = result.redirectUrl;
                } else {
                    toast.success('Pago completado con éxito', { id: loadingToast });
                    setStep(3); // Ir a confirmación
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al procesar el pago', { id: loadingToast });
            setIsProcessing(false);
        }
    };

    if (isLoadingMethods || (methods?.length === 1 && !hasAttemptedAutoSelect)) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <FiLoader className="w-10 h-10 text-azul-primario animate-spin" />
                <p className="text-gray-500 animate-pulse font-medium">Configurando pasarela segura...</p>
            </div>
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
                    El precio se valida directamente en el servidor para garantizar la máxima seguridad financiera.
                </p>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                    Selecciona tu método de pago
                </p>
                
                {methods?.map((method: any) => (
                    <button
                        key={method.id}
                        onClick={() => handlePayment(method.id)}
                        disabled={isProcessing}
                        className="w-full group flex items-center justify-between p-5 rounded-2xl border-2 border-gray-100 hover:border-azul-primario hover:bg-azul-claro/10 transition-all duration-300 disabled:opacity-50"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-azul-primario group-hover:scale-110 transition-transform">
                                <FiCreditCard size={24} />
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-azul-primario text-lg">{method.titulo}</p>
                                <p className="text-xs text-gray-500 font-medium">Procesamiento Instantáneo • HMAC Secured</p>
                            </div>
                        </div>
                        <FiArrowRight className="text-gray-300 group-hover:text-azul-primario group-hover:translate-x-1 transition-all" size={20} />
                    </button>
                ))}
            </div>

            {/* Resumen Final */}
            <div className="border-t border-gray-100 pt-6 mt-6">
                <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                    <span className="text-gray-500 font-medium">Total Final a Pagar:</span>
                    <span className="text-3xl font-black text-azul-primario">
                        {formatUSD(total)}
                    </span>
                </div>

                <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={isProcessing}
                    className="w-full mt-4 py-3 text-gray-400 hover:text-gray-600 text-sm font-bold transition-colors uppercase tracking-widest"
                >
                    ← Modificar mis datos
                </button>
            </div>
        </motion.div>
    );
};
