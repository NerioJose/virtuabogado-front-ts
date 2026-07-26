'use client';

import { use } from 'react';
import { motion } from 'framer-motion';
import { FiXCircle, FiRefreshCw, FiArrowLeft, FiAlertTriangle } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

export default function PaymentErrorPage({
    searchParams
}: {
    searchParams: Promise<{ orderId: string, error?: string }>
}) {
    const { orderId, error } = use(searchParams);

    return (
        <main className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-xl w-full">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-red-50"
                >
                    {/* Brand */}
                    <div className="mb-8">
                        <Image
                            src="/logo/logo_sf_1.png"
                            alt="VirtuAbogado"
                            width={140}
                            height={40}
                            className="mx-auto"
                        />
                    </div>

                    {/* Animated Error Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.2 
                        }}
                        className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <FiXCircle className="text-red-600 w-12 h-12" />
                    </motion.div>

                    <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                        Error en el Pago
                    </h1>
                    
                    <p className="text-gray-600 mb-8 leading-relaxed max-w-sm mx-auto">
                        Lo sentimos, Zenobank no pudo procesar tu transacción. No se ha realizado ningún cargo a tu cuenta.
                    </p>

                    {/* Error Details */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-red-50/50 rounded-2xl p-6 mb-8 text-left border border-red-100 flex items-start gap-4"
                    >
                        <FiAlertTriangle className="text-red-500 mt-1 flex-shrink-0" size={24} />
                        <div>
                            <p className="text-sm font-bold text-red-800 mb-1 tracking-tight">Detalle del error:</p>
                            <p className="text-xs text-red-600 font-medium leading-relaxed">
                                {error || "La transacción fue rechazada o cancelada por el usuario. Por favor verifica tus fondos e intenta de nuevo."}
                            </p>
                            <div className="mt-3">
                                <span className="text-[10px] text-red-400 font-mono">Ref: {orderId}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-4">
                        <Link href="/mis-servicios" className="group">
                            <button type="button" className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 bg-vinotinto/90 hover:bg-vinotinto transition">
                                <FiRefreshCw className="animate-spin-slow" />
                                Intentar con otro método
                            </button>
                        </Link>
                        
                        <Link href="/" className="text-sm text-gray-500 hover:text-azul-primario font-medium transition-colors flex items-center justify-center gap-2">
                            <FiArrowLeft />
                            Volver al inicio
                        </Link>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                            Si el problema persiste, contacta con nuestro equipo de soporte técnico.
                        </p>
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
