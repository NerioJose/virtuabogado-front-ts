'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { processPaymentAction } from '../actions/processPaymentAction';
import { toast } from 'sonner';
import { Loader2, CreditCard, ShieldCheck, ArrowRight } from 'lucide-react';
import { PaymentMethodDB } from '../types/checkout.types';

interface PaymentSelectorModalProps {
    serviceId: number;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (data: any) => void;
}

export function PaymentSelectorModal({ serviceId, isOpen, onClose, onSuccess }: PaymentSelectorModalProps) {
    const { data: methods, isLoading } = usePaymentMethods();
    const [isProcessing, setIsProcessing] = useState(false);
    const [shouldAutoSelect, setShouldAutoSelect] = useState(true);
    const mountedRef = useRef(true);

    const handlePayment = useCallback(async (paymentMethodId: string) => {
        setIsProcessing(true);
        try {
            const result = await processPaymentAction({ serviceId, paymentMethodId });
            
            if (result.success) {
                if (result.redirectUrl) {
                    window.location.href = result.redirectUrl;
                } else {
                    toast.success('Pago completado con éxito');
                    onSuccess?.(result.order);
                    onClose();
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'Error al procesar el pago');
        } finally {
            if (mountedRef.current) setIsProcessing(false);
        }
    }, [serviceId, onSuccess, onClose]);

    // Lógica: Si solo hay 1 método, saltar directamente al pago (Skip Selection)
    useEffect(() => {
        mountedRef.current = true;
        if (!isLoading && methods && methods.length === 1 && shouldAutoSelect && isOpen) {
            handlePayment(methods[0].id);
            setShouldAutoSelect(false); // Evitar loop
        }
        return () => { mountedRef.current = false; };
    }, [methods, isLoading, isOpen, shouldAutoSelect, handlePayment]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="bg-azul-primario p-6 text-white">
                        <h3 className="text-xl font-bold flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-azul-claro" />
                            Seleccionar Método de Pago
                        </h3>
                        <p className="text-azul-claro/80 text-sm mt-1">Conexión Segura (Zero-Trust Architecture)</p>
                    </div>

                    <div className="p-6">
                        {isLoading || isProcessing ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="w-10 h-10 text-azul-primario animate-spin" />
                                <p className="text-gray-600 animate-pulse">
                                    {isProcessing ? 'Procesando pago seguro...' : 'Cargando opciones...'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {methods?.map((method: PaymentMethodDB) => (
                                    <button type="button"
                                        key={method.id}
                                        onClick={() => handlePayment(method.id)}
                                        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 hover:border-azul-primario hover:bg-azul-claro/20 transition duration-300 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-azul-claro rounded-xl flex items-center justify-center text-azul-primario group-hover:scale-110 transition-transform">
                                                <CreditCard className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-azul-primario">{method.name}</p>
                                                <p className="text-xs text-gray-500">Activado vía Admin Dashboard</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-azul-primario transition-colors" />
                                    </button>
                                ))}
                                
                                <button type="button" 
                                    onClick={onClose}
                                    className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
                                >
                                    Cancelar y volver
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer / Badge */}
                    <div className="bg-gray-50 p-4 border-t flex items-center justify-center gap-2">
                        <div className="flex -space-x-2">
                            <div className="w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-blue-600 italic">ZEN</span>
                            </div>
                            <div className="w-6 h-6 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-gray-400">VISA</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Respaldo Fintech Premium</p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
