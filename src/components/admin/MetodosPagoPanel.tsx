'use client';

import React from 'react';
import { usePaymentMethods } from '@/features/checkout/hooks/usePaymentMethods';
import { togglePaymentMethodAction } from '@/features/checkout/actions/paymentMethods';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
    FiCreditCard, 
    FiShield, 
    FiCheckCircle, 
    FiXCircle, 
    FiSettings,
    FiActivity
} from 'react-icons/fi';
import { motion } from 'framer-motion';

export default function MetodosPagoPanel() {
    const { data: methods, isLoading } = usePaymentMethods();
    const queryClient = useQueryClient();

    const handleToggle = async (id: string, currentStatus: boolean) => {
        const loadingToast = toast.loading('Actualizando pasarela...');
        try {
            const result = await togglePaymentMethodAction(id, !currentStatus);
            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: ['PaymentMethods'] });
                toast.success('Estado de pasarela actualizado', { id: loadingToast });
            } else {
                toast.error('Error al actualizar el estado', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Error de conexión', { id: loadingToast });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Cargando pasarelas de pago...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Informativo */}
            <div className="bg-gradient-to-r from-azul-primario to-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <FiShield className="text-azul-claro" />
                        Métodos de Pago
                    </h2>
                    <p className="text-azul-claro/80 mt-2 max-w-2xl">
                        Gestiona las pasarelas de pago activas en la plataforma. 
                        Los cambios son reactivos y se aplican instantáneamente al flujo de checkout del cliente.
                    </p>
                </div>
                <FiActivity className="absolute right-[-20px] top-[-20px] w-64 h-64 text-white/5 rotate-12" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {methods?.map((method) => (
                    <motion.div
                        key={method.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`bg-white rounded-2xl shadow-sm border-2 transition-all p-6 ${
                            method.activo ? 'border-azul-primario/20' : 'border-gray-100 grayscale'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                                    method.activo ? 'bg-azul-claro text-azul-primario' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    <FiCreditCard size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-azul-primario">{method.titulo}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {method.activo ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <FiCheckCircle size={10} /> Operativo
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <FiXCircle size={10} /> Inactivo
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400 font-mono">ID: {method.name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Switch de activación */}
                            <button
                                onClick={() => handleToggle(method.id, method.activo)}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-azul-primario focus:ring-offset-2 ${
                                    method.activo ? 'bg-azul-primario' : 'bg-gray-300'
                                }`}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                        method.activo ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FiSettings size={14} />
                                <span>Zero-Trust Validation</span>
                            </div>
                            <button className="text-azul-primario font-bold hover:underline">
                                Ver Configuración
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Alerta Fintech */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                <div className="flex items-start gap-3">
                    <FiShield className="text-amber-600 mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="text-amber-800 font-bold">Seguridad Bancaria Activada</h4>
                        <p className="text-amber-700 text-sm mt-1">
                            Este panel utiliza arquitectura de Ciberseguridad avanzada. Todas las transacciones requieren validación de firma HMAC y el motor de precios consulta la base de datos en tiempo real para evitar inyecciones de precios desde el cliente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
