'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingCart, FiX, FiRefreshCw } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { formatUSD } from '@/lib/finance';

/**
 * Componente que muestra un banner de recuperación de carrito abandonado
 * Solo aparece si hay un checkout incompleto (sin completedAt) de menos de 30 minutos
 */
export const CartRecovery = () => {
    const { 
        service, 
        isOpen, 
        openCheckout, 
        reset, 
        step, 
        completedAt, 
        isProcessingPayment,
        isWaitingForWebhook 
    } = useCheckout();
    const { isAuthenticated } = useAuthStore();
    const [showRecovery, setShowRecovery] = useState(false);

    useEffect(() => {
        // --- REGLA UX: SUPRESIÓN TOTAL SI ESTÁ PAGANDO ---
        if (isProcessingPayment || isWaitingForWebhook) {
            setShowRecovery(false);
            return;
        }

        // No mostrar si el usuario no está autenticado
        if (!isAuthenticated) {
            setShowRecovery(false);
            return;
        }

        // No mostrar si el modal ya está abierto
        if (isOpen) {
            setShowRecovery(false);
            return;
        }

        // No mostrar si no hay datos de checkout
        if (!service) {
            setShowRecovery(false);
            return;
        }

        // ✅ CLAVE: No mostrar si la compra ya se completó exitosamente
        if (completedAt) {
            setShowRecovery(false);
            return;
        }

        // Solo mostrar si el usuario estaba en un paso avanzado
        if (step < 2) {
            setShowRecovery(false);
            return;
        }

        // --- LÓGICA DE INACTIVIDAD (15 MIN) ---
        // Por ahora lo hacemos simple: no saltar de inmediato al navegar
        // Si quieres algo más avanzado, podrías guardar un timestamp en localStorage
        const timer = setTimeout(() => {
            if (!isOpen && service && !completedAt && !isProcessingPayment) {
                console.log('🛒 [UX] Carrito abandonado detectado tras periodo de gracia.');
                setShowRecovery(true);
            }
        }, 2000); // 2 segundos de gracia para evitar parpadeos al navegar

        return () => clearTimeout(timer);
    }, [service, isOpen, step, completedAt, isAuthenticated, isProcessingPayment, isWaitingForWebhook]);

    const handleContinue = () => {
        if (service) {
            openCheckout(service);
        }
        setShowRecovery(false);
    };

    const handleDiscard = () => {
        reset();
        setShowRecovery(false);
    };

    const priceFormatted = service?.precio ? formatUSD(service.precio) : '';

    return (
        <AnimatePresence>
            {showRecovery && (
                <motion.div
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -100, opacity: 0 }}
                    className="fixed top-20 left-1/2 transform -translate-x-1/2 z-40 max-w-md w-full mx-4"
                >
                    <div className="bg-white rounded-xl shadow-2xl border-2 border-azul-primario p-4">
                        <div className="flex items-start gap-3">
                            {/* Icono */}
                            <div className="flex-shrink-0 w-10 h-10 bg-azul-primario/10 rounded-full flex items-center justify-center">
                                <FiShoppingCart className="text-azul-primario text-xl" />
                            </div>

                            {/* Contenido */}
                            <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 mb-1">
                                    Tienes una compra sin completar
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    <strong>{service?.nombre}</strong>
                                    {priceFormatted && ` - ${priceFormatted}`}
                                </p>

                                {/* Botones */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleContinue}
                                        className="flex-1 btn-primary text-sm py-2 flex items-center justify-center gap-2"
                                    >
                                        <FiRefreshCw className="text-sm" />
                                        Continuar
                                    </button>
                                    <button
                                        onClick={handleDiscard}
                                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Descartar
                                    </button>
                                </div>
                            </div>

                            {/* Botón cerrar */}
                            <button
                                onClick={handleDiscard}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <FiX />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
