'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import { useCheckoutStore } from '../store/checkoutStore';
import { useCheckoutStorage } from '../hooks/useCheckoutStorage';
import { useAuthStore } from '@/features/auth/store/authStore';
import { StepIndicator } from './StepIndicator';
import { ServiceSummary } from './ServiceSummary';
import { UserDataStep } from './UserDataStep';
import { PaymentStep } from './PaymentStep';
import { ConfirmationStep } from './ConfirmationStep';
import { LoadingOverlay } from './LoadingOverlay';
import { ErrorMessage } from './ErrorMessage';

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

    // Limpiar storage cuando se completa el checkout
    useEffect(() => {
        if (step === 3) {
            // Limpiar después de 5 segundos (usuario ve la confirmación)
            const timer = setTimeout(() => {
                clearStorage();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [step, clearStorage]);

    // 🛡️ GUARDA DE SEGURIDAD: Si está abierto en Paso 1 pero ya está autenticado, saltar al Paso 2
    useEffect(() => {
        if (isOpen && step === 1 && isAuthenticated) {
            console.log('🛡️ CheckoutModal Guard: User is authenticated, skipping to Step 2');
            useCheckoutStore.getState().setStep(2);
        }
    }, [isOpen, step, isAuthenticated]);

    // Prevenir scroll del body cuando el modal está abierto
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
            // Si está en confirmación, limpiar todo
            reset();
            clearStorage();
        }
        closeCheckout();
    }, [step, reset, clearStorage, closeCheckout]);

    // ESC para cerrar
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

    // Debug
    console.log('RENDER Modal:', { isOpen, hasService: !!service, step });

    if (!isOpen || !service) {
        console.log('❌ Modal no renderiza porque:', { isOpen, noService: !service });
        return null;
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={!isLoading ? handleClose : undefined}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', duration: 0.3 }}
                    className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="border-b border-gray-200 p-6 pb-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-azul-primario">
                                {step === 3 ? '¡Compra Completada!' : 'Finalizar Compra'}
                            </h2>
                            <button
                                onClick={handleClose}
                                disabled={isLoading}
                                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                            >
                                <FiX className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 relative">
                        {/* Loading Overlay */}
                        {isLoading && <LoadingOverlay message="Procesando tu pago..." />}

                        {/* Error Message */}
                        {error && (
                            <ErrorMessage
                                message={error}
                                onDismiss={() => {
                                    // Clear error usando el store directamente
                                    useCheckoutStore.getState().reset();
                                }}
                            />
                        )}

                        {/* Step Indicator (solo para pasos 1 y 2) */}
                        {step < 3 && <StepIndicator currentStep={step} totalSteps={2} />}

                        {/* Service Summary (solo para pasos 1 y 2) */}
                        {step < 3 && <ServiceSummary service={service} />}

                        {/* Steps Content */}
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
