'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiArrowRight, FiFileText, FiMessageSquare, FiLoader, FiAlertCircle, FiRefreshCw, FiAlertTriangle } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useOrder } from '@/features/orders/hooks/useOrders';
import { useQueryClient } from '@tanstack/react-query';
import { ORDER_KEYS } from '@/features/orders/hooks/useOrders';

export default function PaymentSuccessPage({
    searchParams
}: {
    searchParams: Promise<{ orderId: string }>
}) {
    const { orderId } = use(searchParams);
    const { data: order, isLoading, isError, error } = useOrder(orderId, {
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (!status || status === 'PAGO_PENDIENTE') return 3000;
            return false;
        },
    });
    const queryClient = useQueryClient();
    const router = useRouter();

    const [timeoutReached, setTimeoutReached] = useState(false);

    const currentStatus = order?.status;
    const isPendingApproval = currentStatus === 'PAGO_PENDIENTE';

    const isApproved = currentStatus && ['PAID', 'EN_PROGRESO', 'COMPLETADO'].includes(currentStatus);

    const isFailed = ['PAGO_RECHAZADO', 'FALLIDO', 'CANCELADO'].includes(currentStatus || '');

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (isPendingApproval) {
            timeoutId = setTimeout(() => {
                setTimeoutReached(true);
            }, 30000);
        }
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isPendingApproval]);

    useEffect(() => {
        if (isApproved) {
            router.push('/mis-servicios');
        }
    }, [isApproved, router]);

    const handleRetry = useCallback(() => {
        setTimeoutReached(false);
        queryClient.invalidateQueries({ queryKey: ORDER_KEYS.detail(orderId) });
    }, [queryClient, orderId]);

    if (isLoading && !order) {
        return (
            <main className="min-h-[80vh] flex items-center justify-center p-4">
                <FiLoader className="animate-spin text-azul-primario w-12 h-12" />
            </main>
        );
    }

    if (isError && !order) {
        return (
            <main className="min-h-[80vh] flex items-center justify-center p-4">
                <div className="max-w-xl w-full text-center">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-amber-100">
                        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FiAlertTriangle className="text-amber-600 w-12 h-12" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">
                            Error de Conexión
                        </h1>
                        <p className="text-gray-600 mb-8 leading-relaxed">
                            No pudimos verificar el estado de tu pago. Si tu pago fue exitoso, no te preocupes, tu servicio está siendo procesado.
                        </p>
                        <button type="button"
                            onClick={handleRetry}
                            className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md mb-4"
                        >
                            <FiRefreshCw />
                            Reintentar
                        </button>
                        <Link href="/mis-servicios">
                            <button type="button" className="w-full py-4 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition">
                                Ir a Mis Servicios
                            </button>
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="max-w-xl w-full">
                <AnimatePresence mode="wait">
                    {isPendingApproval && (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-gray-100"
                        >
                            <div className="mb-8">
                                <Image src="/logo/logo_sf_1.png" alt="VirtuAbogado" width={140} height={40} className="mx-auto" />
                            </div>

                            {timeoutReached ? (
                                <>
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6"
                                    >
                                        <FiAlertCircle className="text-amber-600 w-12 h-12" />
                                    </motion.div>
                                    <h1 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">
                                        Demora en la Verificación
                                    </h1>
                                    <p className="text-gray-600 mb-8 leading-relaxed">
                                        El pago fue procesado pero estamos esperando la confirmación de Zenobank. En la mayoría de los casos, la confirmación llega en segundos.
                                    </p>
                                    <button type="button" 
                                        onClick={handleRetry}
                                        className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-md"
                                    >
                                        <FiRefreshCw />
                                        Volver a intentar validación
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center">
                                        <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                                        <div className="absolute inset-0 rounded-full border-4 border-azul-primario border-t-transparent animate-spin"></div>
                                        <Image src="/images/zenobank-logo.png" alt="Zenobank" width={32} height={32} className="opacity-50" />
                                    </div>
                                    <h1 className="text-2xl font-black text-azul-primario mb-4 tracking-tight animate-pulse">
                                        Validando con Zenobank...
                                    </h1>
                                    <p className="text-gray-500 mb-8 leading-relaxed text-sm">
                                        Por favor espera un momento mientras establecemos comunicación segura con la pasarela financiera. Refrescando automáticamente.
                                    </p>
                                </>
                            )}
                        </motion.div>
                    )}

                    {isFailed && (
                        <motion.div
                            key="failed"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-rose-100"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-24 h-24 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <FiAlertCircle className="text-rose-600 w-12 h-12" />
                            </motion.div>
                            <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                                Pago Rechazado
                            </h1>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Lamentablemente, la transacción no pudo ser procesada o fue rechazada por Zenobank.
                            </p>
                            <Link href="/servicios">
                                <button type="button" className="w-full py-4 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition">
                                    Regresar al Catálogo
                                </button>
                            </Link>
                        </motion.div>
                    )}

                    {isApproved && (
                        <motion.div
                            key="approved"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 text-center border border-gray-100"
                        >
                            <div className="mb-8">
                                <Image src="/logo/logo_sf_1.png" alt="VirtuAbogado" width={140} height={40} className="mx-auto" />
                            </div>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                            >
                                <FiCheckCircle className="text-green-600 w-12 h-12" />
                            </motion.div>

                            <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">
                                ¡Pago Confirmado!
                            </h1>
                            
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Tu pago ha sido procesado correctamente y la confirmación oficial ha sido recibida. El servicio ya está activo en tu panel.
                            </p>

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

                            <div className="flex flex-col gap-4">
                                <Link href={`/detalle-servicio/${orderId}`} className="group">
                                    <button type="button" className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 group-hover:gap-4 transition">
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

                            <p className="mt-8 text-xs text-gray-400 font-bold animate-pulse">
                                Redirigiendo al panel de servicios...
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </main>
    );
}
