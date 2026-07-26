'use client';

import React from 'react';
import { FiCheckCircle, FiMail, FiLoader } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useConfirmationStep } from '../hooks/useConfirmationStep';

export const ConfirmationStep: React.FC = () => {
    const {
        orderId,
        service,
        userData,
        isPendingConfirmation,
        handleClose
    } = useConfirmationStep();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
        >
            {/* Ícono dinámico */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                    isPendingConfirmation ? 'bg-amber-100' : 'bg-green-100'
                }`}
            >
                {isPendingConfirmation ? (
                    <div className="relative">
                        <FiLoader className="w-12 h-12 text-amber-600 animate-spin" />
                    </div>
                ) : (
                    <FiCheckCircle className="w-12 h-12 text-green-600" />
                )}
            </motion.div>

            {/* Mensaje dinámico */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {isPendingConfirmation ? 'Validando Pago...' : '¡Pago Exitoso!'}
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-xs mx-auto text-balance">
                    {isPendingConfirmation 
                        ? 'Estamos detectando tu pago en tiempo real. Por favor, no cierres esta ventana.'
                        : 'Tu servicio ha sido activado correctamente. Redirigiendo a tu panel en unos segundos...'}
                </p>
            </motion.div>

            {/* Detalles de la orden */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-50 rounded-lg p-6 mb-6 text-left border border-gray-100"
            >
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Número de orden:</span>
                        <span className="font-mono font-bold text-gray-900">{orderId?.slice(0, 13)}...</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Servicio:</span>
                        <span className="font-semibold text-gray-900">{service?.titulo || service?.nombre}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                        <span className="text-gray-500">Estado:</span>
                        <span className={`font-black text-[10px] uppercase px-2 py-0.5 rounded ${
                            isPendingConfirmation ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-green-100 text-green-700'
                        }`}>
                            {isPendingConfirmation ? 'Sincronizando...' : 'Confirmado'}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Información de email */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg mb-6"
            >
                <FiMail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-left text-sm">
                    <p className="text-blue-900 font-medium mb-1">
                        Confirmación enviada
                    </p>
                    <p className="text-blue-700 text-xs">
                        Hemos enviado los detalles a <strong>{userData?.email}</strong>
                    </p>
                </div>
            </motion.div>

            {/* Botones - Reducidos a lo mínimo según solicitud */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col gap-3"
            >
                {!isPendingConfirmation && (
                   <div className="w-full bg-gray-100 rounded-full h-1 mb-4 overflow-hidden">
                       <motion.div 
                           className="bg-green-500 h-full"
                           initial={{ width: '0%' }}
                           animate={{ width: '100%' }}
                           transition={{ duration: 5, ease: 'linear' }}
                       />
                   </div>
                )}
                <button type="button"
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 text-sm transition-colors py-2"
                >
                    Cerrar ventana
                </button>
            </motion.div>
        </motion.div>
    );
};
