'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiArrowRight, FiFileText, FiMessageSquare } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import { useOrder } from '@/features/orders/hooks/useOrders';

export default function PaymentSuccessPage({
    searchParams
}: {
    searchParams: Promise<{ orderId: string }>
}) {
    const { orderId } = use(searchParams);
    const { data: order, isLoading } = useOrder(orderId);
    const [counter, setCounter] = useState(5);

    // Redirección automática opcional
    useEffect(() => {
        if (!isLoading && order) {
            const timer = setInterval(() => {
                setCounter((prev) => (prev > 0 ? prev - 1 : 0));
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isLoading, order]);

    return (
        <main className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-xl w-full">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-gray-100"
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

                    {/* Animated Success Icon */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                            type: "spring",
                            stiffness: 260,
                            damping: 20,
                            delay: 0.2 
                        }}
                        className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                        <FiCheckCircle className="text-green-600 w-12 h-12" />
                    </motion.div>

                    <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                        ¡Pago Confirmado!
                    </h1>
                    
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Tu pago ha sido procesado correctamente por Zenobank. El servicio ya está activo en tu panel y un abogado especializado revisará tu caso en breve.
                    </p>

                    {/* Order Summary Card */}
                    {order && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-gray-50 rounded-2xl p-6 mb-8 text-left border border-gray-100"
                        >
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Detalles del Servicio</p>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Orden:</span>
                                    <span className="text-sm font-mono font-bold text-azul-primario">#{order.numericId}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-500">Servicio:</span>
                                    <span className="text-sm font-semibold text-gray-800">{order.items[0]?.serviceName}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="text-sm font-bold text-gray-700">Total:</span>
                                    <span className="text-lg font-black text-azul-primario">${order.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Next Steps Buttons */}
                    <div className="flex flex-col gap-4">
                        <Link href={`/detalle-servicio/${orderId}`} className="group">
                            <button className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 group-hover:gap-4 transition-all">
                                Ir al Panel del Servicio
                                <FiArrowRight />
                            </button>
                        </Link>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex flex-col items-center text-center">
                                <FiMessageSquare className="text-blue-600 mb-2" size={20} />
                                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-tighter">Chat Activo</span>
                            </div>
                            <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 flex flex-col items-center text-center">
                                <FiFileText className="text-purple-600 mb-2" size={20} />
                                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-tighter">Sube Documentos</span>
                            </div>
                        </div>
                    </div>

                    <p className="mt-8 text-xs text-gray-400">
                        Serás redirigido automáticamente en {counter} segundos...
                    </p>
                </motion.div>
            </div>
        </main>
    );
}
