'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiMail, FiArrowRight } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import Link from 'next/link';

export const ConfirmationStep: React.FC = () => {
    const { orderId, service, userData, closeCheckout, tempPassword, paymentMethod } = useCheckout();
    
    // Determinamos si es un pago que requiere confirmación externa (Zenobank/Cripto)
    const isPendingConfirmation = (paymentMethod as string) === 'zenobank' || (paymentMethod as string) === 'crypto';

    const router = useRouter();

    // Redirección automática tras 6 segundos de éxito final
    React.useEffect(() => {
        if (!isPendingConfirmation) {
            const timer = setTimeout(() => {
                closeCheckout();
                router.push('/mis-servicios');
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [isPendingConfirmation, closeCheckout, router]);

    const handleClose = () => {
        closeCheckout();
    };

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
                        <div className="absolute inset-0 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                        <FiCheckCircle className="w-12 h-12 text-amber-600 opacity-50" />
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
                    {isPendingConfirmation ? 'Pago en Proceso' : '¡Pago Exitoso!'}
                </h3>
                <p className="text-sm text-gray-600 mb-6 max-w-xs mx-auto text-balance">
                    {isPendingConfirmation 
                        ? 'Estamos esperando la confirmación de la red. Tu servicio se activará automáticamente en unos minutos.'
                        : 'Tu servicio ha sido contratado correctamente y ya está activo en tu panel.'}
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
                        <span className="font-mono font-bold text-gray-900">{orderId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Servicio:</span>
                        <span className="font-semibold text-gray-900">{service?.titulo || service?.nombre}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
                        <span className="text-gray-500">Estado:</span>
                        <span className={`font-black text-[10px] uppercase px-2 py-0.5 rounded ${
                            isPendingConfirmation ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                        }`}>
                            {isPendingConfirmation ? 'Esperando Validación' : 'Confirmado'}
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
                        Confirmación enviada a tu email
                    </p>
                    <p className="text-blue-700">
                        Hemos enviado los detalles de tu compra a <strong>{userData?.email}</strong>
                    </p>
                    {tempPassword && (
                        <div className="mt-4 p-3 bg-white/50 border border-blue-100 rounded-md">
                            <p className="text-blue-900 font-semibold mb-1">Tus credenciales de acceso:</p>
                            <div className="flex flex-col gap-1">
                                <p className="text-blue-800">Email: <span className="font-mono">{userData?.email}</span></p>
                                <p className="text-blue-800">Clave temporal: <span className="font-mono bg-blue-100 px-1 rounded">{tempPassword}</span></p>
                            </div>
                            <p className="text-xs text-blue-600 mt-2 italic">
                                * Te recomendamos cambiar tu clave al ingresar a tu panel.
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Botones */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col gap-3"
            >
                <Link href="/mis-servicios" onClick={handleClose}>
                    <button className="btn-primary w-full">
                        Ver mis servicios
                        <FiArrowRight className="inline ml-2" />
                    </button>
                </Link>
                <button
                    onClick={handleClose}
                    className="btn-secondary w-full"
                >
                    Cerrar
                </button>
            </motion.div>
        </motion.div>
    );
};
