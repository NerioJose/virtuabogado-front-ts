import React from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiMail, FiArrowRight } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import Link from 'next/link';

export const ConfirmationStep: React.FC = () => {
    const { orderId, service, userData, reset } = useCheckout();

    const handleClose = () => {
        reset();
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-6"
        >
            {/* Ícono de éxito */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
                <FiCheckCircle className="w-12 h-12 text-green-600" />
            </motion.div>

            {/* Mensaje de éxito */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    ¡Pago Exitoso!
                </h3>
                <p className="text-gray-600 mb-6">
                    Tu servicio ha sido contratado correctamente
                </p>
            </motion.div>

            {/* Detalles de la orden */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-50 rounded-lg p-6 mb-6 text-left"
            >
                <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Número de orden:</span>
                        <span className="font-semibold text-gray-900">{orderId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Servicio:</span>
                        <span className="font-semibold text-gray-900">{service?.nombre}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total pagado:</span>
                        <span className="font-semibold text-azul-primario">${service?.precio?.toFixed(2)}</span>
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
