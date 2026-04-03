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
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 z-50 w-auto md:max-w-md pointer-events-none"
                >
                    <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-azul-primario/20 p-5 pointer-events-auto overflow-hidden relative group">
                        {/* Shimmer effect on hover */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                        
                        <div className="flex items-start gap-4">
                            {/* Icono animado */}
                            <motion.div 
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ repeat: Infinity, duration: 4 }}
                                className="flex-shrink-0 w-12 h-12 bg-azul-primario/10 rounded-2xl flex items-center justify-center border border-azul-primario/10"
                            >
                                <FiShoppingCart className="text-azul-primario text-2xl" />
                            </motion.div>
                            
                            {/* Contenido */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h4 className="font-bold text-slate-900 text-base truncate">
                                        ¿Continuar asesoría?
                                    </h4>
                                    <button
                                        onClick={handleDiscard}
                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Cerrar"
                                    >
                                        <FiX className="text-lg" />
                                    </button>
                                </div>
                                <p className="text-sm text-slate-500 mb-4 line-clamp-1">
                                    <span className="font-semibold text-azul-primario">{service?.nombre}</span>
                                    {priceFormatted && (
                                        <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-black uppercase text-slate-600">
                                            {priceFormatted}
                                        </span>
                                    )}
                                </p>
                                
                                {/* Botones */}
                                <div className="flex items-center gap-3">
                                    <motion.button
                                        onClick={handleContinue}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="flex-1 h-11 bg-azul-primario text-white rounded-xl font-bold text-sm shadow-lg shadow-azul-primario/20 flex items-center justify-center gap-2 hover:bg-azul-oscuro transition-colors px-4"
                                    >
                                        <FiRefreshCw className="text-xs" />
                                        <span>Retomar compra</span>
                                    </motion.button>
                                    
                                    <button
                                        onClick={handleDiscard}
                                        className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors"
                                    >
                                        Luego
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
