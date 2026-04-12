'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiCreditCard, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { SiBitcoin, SiVisa, SiMastercard, SiAmericanexpress } from 'react-icons/si';
import { FaCcPaypal } from 'react-icons/fa';
import { usePaymentStep } from '../hooks/usePaymentStep';

export const PaymentStep: React.FC = () => {
    const {
        methods,
        isLoadingMethods,
        isWaitingForWebhook,
        isPaid,
        showFallbackButton,
        isProcessingPayment,
        setStep,
        handlePayment
    } = usePaymentStep();

    if (isLoadingMethods) {
        return (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-azul-primario/10 border-t-azul-primario rounded-full animate-spin"></div>
                    <FiShield className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-azul-primario" size={16} />
                </div>
                <div className="text-center">
                    <p className="text-azul-primario font-bold text-sm animate-pulse tracking-tight">Sincronizando pasarelas...</p>
                </div>
            </div>
        );
    }

    if (isWaitingForWebhook) {
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
                            <FiCheckCircle className="text-green-600" size={32} />
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

                {/* No mostramos botón de rescate si el pago está confirmado o si preferimos flujo 100% automático */}
                {showFallbackButton && !isPaid && (
                   <div className="pt-4 text-xs text-slate-400 italic font-medium animate-pulse">
                     Sincronizando con Zenobank... un momento por favor.
                   </div>
                )}
            </motion.div>
        );
    }

    if (!methods || methods.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
        >
            <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] pl-1">
                    Selecciona tu Método de Pago Blindado
                </p>

                {methods.map((method: any) => (
                    <button
                        key={method.id}
                        onClick={() => handlePayment(method.identifier)}
                        disabled={isProcessingPayment}
                        className={`w-full group flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300 disabled:opacity-50 shadow-sm hover:shadow-md bg-white ${
                            method.identifier === 'zenobank'
                                ? 'border-azul-primario shadow-azul-primario/5' 
                                : 'border-gray-100 hover:border-azul-primario hover:bg-azul-claro/5'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center text-azul-primario group-hover:scale-110 transition-transform border border-gray-100">
                                {method.identifier === 'zenobank' ? (
                                    <SiBitcoin size={24} className="text-[#f7931a]" />
                                ) : (
                                    <FiCreditCard size={24} />
                                )}
                            </div>
                            <div className="text-left">
                                <p className="font-black text-azul-primario text-base leading-tight uppercase tracking-tight">{method.name}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Encriptación de Punto a Punto</p>
                            </div>
                        </div>
                        <FiArrowRight className="text-gray-300 group-hover:text-azul-primario group-hover:translate-x-1 transition-all" size={20} />
                    </button>
                ))}
            </div>

            {/* --- BARRA DE CONFIANZA: SEGURIDAD GARANTIZADA --- */}
            <div className="flex flex-col items-center gap-6 py-8 px-4 border border-slate-100 rounded-[2.5rem] bg-slate-50/30 relative overflow-hidden">
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
        </motion.div>
    );
};
