'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiLock, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { SiBitcoin } from 'react-icons/si';
import { useCheckout } from '../hooks/useCheckout';
import { useCheckoutStore } from '../store/checkoutStore';
import { useCheckoutStorage } from '../hooks/useCheckoutStorage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { StepIndicator } from './StepIndicator';
import { ServiceSummary } from './ServiceSummary';
import { UserDataStep } from './UserDataStep';
import { PaymentStep } from './PaymentStep';
import { ConfirmationStep } from './ConfirmationStep';
import { LoadingOverlay } from './LoadingOverlay';
import { ErrorMessage } from './ErrorMessage';
import { formatUSD } from '@/lib/finance';

// --- COMPONENTE TÁCTICO: ALERTA DE PRECISIÓN CRIPTO ---
const ZenobankTacticalAlert: React.FC<{ total: number }> = ({ total }) => {
    const { data: methods } = usePaymentMethods();
    const hasZenobank = methods?.some((m: any) => m.identifier === 'zenobank');

    if (!hasZenobank) return null;

    return (
        <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-start gap-4 shadow-sm relative overflow-hidden"
        >
            <div className="bg-amber-100 p-2 rounded-xl border border-amber-200">
                <FiAlertCircle className="text-amber-600 animate-bounce" size={20} />
            </div>
            <div className="flex-1 space-y-1">
                <p className="text-[9px] font-black text-amber-800 uppercase tracking-[0.1em] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                    Requisito de Activación Inmediata
                </p>
                <p className="text-[10px] text-amber-900 leading-tight font-medium">
                    Al usar <span className="font-bold">Zenobank</span>, debes transferir el monto <span className="font-bold underline text-amber-800 uppercase tracking-tighter">EXACTO</span> incluyendo todos los decimales para evitar rechazos:
                </p>
                <div className="bg-white/40 px-3 py-1.5 rounded-lg border border-amber-200 flex justify-between items-center mt-2">
                    <span className="text-[9px] font-bold text-amber-900/60 uppercase">Importe Requerido:</span>
                    <span className="text-sm font-mono font-black text-amber-900 tracking-tighter">
                        {formatUSD(total, 2)}
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

export const CheckoutModal: React.FC = () => {
    const {
        isOpen,
        closeCheckout,
        step,
        service,
        isLoading,
        error,
        reset,
    } = useCheckout();

    const { isAuthenticated } = useAuthStore();
    const { clearStorage } = useCheckoutStorage();

    useEffect(() => {
        if (step === 3) {
            const timer = setTimeout(() => {
                clearStorage();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [step, clearStorage]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleClose = React.useCallback(() => {
        if (step === 3) {
            reset();
            clearStorage();
        }
        
        // Marcar como cerrado manualmente para evitar bucles de persistencia
        sessionStorage.setItem('checkout_manually_closed', 'true');
        closeCheckout();
    }, [step, reset, clearStorage, closeCheckout]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isLoading) {
                handleClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleEscape);
        }

        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, isLoading, handleClose]);

    if (!isOpen || !service) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={!isLoading ? handleClose : undefined}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
                >
                    <div className="border-b border-gray-200 p-6 pb-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-azul-primario">
                                {step === 3 ? '¡Compra Completada!' : 'Finalizar Compra'}
                            </h2>
                            <button type="button"
                                onClick={handleClose}
                                disabled={isLoading}
                                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 relative">
                        {isLoading && <LoadingOverlay message="Procesando tu pago..." />}

                        {error && (
                            <ErrorMessage
                                message={error}
                                onDismiss={() => {
                                    useCheckoutStore.getState().reset();
                                }}
                            />
                        )}

                        {step < 3 && <StepIndicator currentStep={step} totalSteps={2} />}

                        {/* --- VISIBILIDAD RADICAL: ESCUDO SSL CABECERA --- */}
                        {step === 2 && (
                            <motion.div 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative overflow-hidden bg-azul-claro/5 backdrop-blur-xl p-4 rounded-2xl flex items-center gap-4 border border-azul-claro/20 shadow-sm mb-6"
                            >
                                <div className="bg-azul-primario/10 p-2 rounded-xl border border-azul-primario/5">
                                    <motion.div
                                        animate={{ scale: [1, 1.1, 1] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <FiLock className="text-azul-primario" size={20} />
                                    </motion.div>
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] text-azul-primario leading-relaxed font-black uppercase tracking-[0.1em]">
                                        Conexión Blindada (HSTS)
                                    </p>
                                    <p className="text-[9px] text-slate-500 leading-tight">
                                        Blindaje industrial <span className="font-bold">AES-256 bits</span>. VirtuAbogado no almacena datos bancarios.
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {/* --- VISIBILIDAD RADICAL: ALERTA TÁCTICA ZENOBANK --- */}
                        {step === 2 && (
                             <ZenobankTacticalAlert total={Number(service.precio) || 0} />
                        )}

                        {step < 3 && <ServiceSummary service={service} />}

                        <AnimatePresence mode="wait">
                            {step === 1 && <UserDataStep key="user-data" />}
                            {step === 2 && <PaymentStep key="payment" />}
                            {step === 3 && <ConfirmationStep key="confirmation" />}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
