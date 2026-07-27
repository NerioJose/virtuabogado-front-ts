'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiCalendar, FiDollarSign, FiFileText, FiClock, FiUser } from 'react-icons/fi';
import { formatOrderId } from '@/lib/formatOrderId';
import { useAuthStore } from '@/features/auth';
// import { useOrdersStore } from '@/features/orders';
import { useOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
// Las imágenes en /public se sirven desde la raíz / en Next.js. No es necesario importarlas como módulos para el componente Image.

export default function DetalleServicioPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params Promise
    const { id } = use(params);

    const router = useRouter();

    // Auth State
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    // React Query Hook - Realtime updates
    const { data: order, isLoading } = useOrder(id);

    // Protección de ruta
    useEffect(() => {
        if (!isAuthenticated && user === null) {
            router.push('/login');
        }
    }, [isAuthenticated, user, router]);

    if (isLoading) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
            </main>
        );
    }

    if (!order) {
        return (
            <main className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
                <h2 className="text-xl font-semibold text-gray-700">Orden no encontrada</h2>
                <Link href="/mis-servicios" className="text-azul-primario hover:underline">
                    Volver a mis servicios
                </Link>
            </main>
        );
    }

    const statusConfig: Record<string, { color: string, text: string }> = {
        [OrderStatus.PENDIENTE]: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente de asignación' },
        [OrderStatus.REVISION]: { color: 'bg-purple-100 text-purple-800', text: 'En revisión' },
        [OrderStatus.EN_PROGRESO]: { color: 'bg-blue-100 text-blue-800', text: 'En proceso' },
        [OrderStatus.COMPLETADO]: { color: 'bg-green-100 text-green-800', text: 'Completado' },
        [OrderStatus.CANCELADO]: { color: 'bg-red-100 text-red-800', text: 'Cancelado' },
        [OrderStatus.FALLIDO]: { color: 'bg-red-100 text-red-800', text: 'Fallido' },
        [OrderStatus.PAGO_PENDIENTE]: { color: 'bg-amber-100 text-amber-800', text: 'Pago pendiente' },
        [OrderStatus.PAGO_RECHAZADO]: { color: 'bg-red-100 text-red-800', text: 'Pago rechazado' },
        [OrderStatus.PAID]: { color: 'bg-green-100 text-green-800', text: 'Pagado' },
    };

    const status = statusConfig[order.status] || statusConfig[OrderStatus.PENDIENTE];
    const isPendingPayment = order.status === OrderStatus.PAGO_PENDIENTE;

    if (isPendingPayment) {
        return (
            <main className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
                <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-amber-100">
                        <FiClock className="text-amber-500" size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Casi listo...</h2>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        Estamos esperando la confirmación de tu pago. En cuanto la red lo valide, habilitaremos tu panel, el chat con el abogado y la subida de documentos.
                    </p>
                    <div className="flex flex-col gap-3">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-left">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Orden de referencia</p>
                            <p className="font-mono text-sm text-azul-primario font-bold">{order.id}</p>
                        </div>
                        <Link href="/mis-servicios" className="btn-primary w-full py-3">
                             Volver a Mis Servicios
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="inline-block mb-4">
                        <Image
                            src="/logo/logo_sf_1.png"
                            alt="VirtuAbogado Logo"
                            width={150}
                            height={50}
                        />
                    </Link>
                    <Link
                        href="/mis-servicios"
                        className="inline-flex items-center text-azul-primario hover:text-vinotinto mb-4"
                    >
                        <FiArrowLeft className="mr-2" />
                        Volver a Mis Servicios
                    </Link>
                    <h1 className="text-3xl font-bold text-azul-primario">Detalles del Servicio</h1>
                </div>

                {/* Tarjeta principal */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                >
                    {/* Header de la tarjeta */}
                    <div className="bg-gradient-to-r from-azul-primario to-azul-claro p-6 text-white">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold mb-2">
                                    {order.items[0]?.serviceName || 'Servicio Legal'}
                                </h2>
                                <p className="text-blue-100">{formatOrderId(order.numericId, order.createdAt)}</p>
                            </div>
                            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${status.color}`}>
                                {status.text}
                            </span>
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 space-y-6">
                        {/* Información del servicio */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Servicio</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-azul-claro/20 rounded-full flex items-center justify-center">
                                        <FiCalendar className="text-azul-primario" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Fecha de contratación</p>
                                        <p className="font-semibold text-gray-900">
                                            {new Date(order.createdAt).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                        <FiDollarSign className="text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Total pagado</p>
                                        <p className="font-semibold text-gray-900">${(order.total || 0).toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                        <FiFileText className="text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Método de pago</p>
                                        <p className="font-semibold text-gray-900">
                                            {order.paymentMethod === 'credit_card' ? 'Tarjeta de Crédito' : 'Otro'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                        <FiClock className="text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">ID de transacción</p>
                                        <p className="font-semibold text-gray-900 text-sm">{order.transactionId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detalles del servicio */}
                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Pedido</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                {order.items?.length ? order.items.map((item, index) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 py-2 border-b border-gray-100 last:border-0">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900 truncate">{item.serviceName || 'Servicio'}</p>
                                            <p className="text-sm text-gray-600">Cantidad: {item.quantity || 1}</p>
                                        </div>
                                        <p className="font-black text-azul-primario text-lg sm:text-base">${(item.price || 0).toFixed(2)}</p>
                                    </div>
                                )) : (
                                    <p className="text-sm text-gray-500 py-4 text-center">No hay información de items disponible</p>
                                )}
                                <div className="mt-4 pt-4 flex justify-between items-center border-t border-gray-200">
                                    <p className="font-black text-gray-900 uppercase tracking-widest text-xs">Total del Pedido</p>
                                    <p className="text-2xl font-black text-azul-primario tracking-tighter">${(order.total || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Siguiente pasos según estado */}
                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximos Pasos</h3>
                            {order.status === OrderStatus.PENDIENTE && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                    <div className="flex items-start">
                                        <FiClock className="text-yellow-600 mt-1 mr-3 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-yellow-900">Pendiente de asignación</p>
                                            <p className="text-sm text-yellow-700 mt-1">
                                                Te contactaremos en breve para asignar un abogado especializado a tu caso y programar una cita.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {order.status === OrderStatus.EN_PROGRESO && (
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                    <div className="flex items-start">
                                        <FiClock className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-blue-900">Servicio en proceso</p>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Un abogado está trabajando en tu caso. Recibirás actualizaciones por email.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {order.status === OrderStatus.COMPLETADO && (
                                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                                    <div className="flex items-start">
                                        <FiFileText className="text-green-600 mt-1 mr-3 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-green-900">Servicio completado</p>
                                            <p className="text-sm text-green-700 mt-1">
                                                ¡Gracias por confiar en nosotros! Si necesitas algo más, no dudes en contactarnos.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Integrado */}
                        <div className="border-t border-gray-200 pt-6" id="chat">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FiUser className="text-azul-primario" />
                                Mensajes del Caso
                            </h3>
                            <div className="rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm">
                                <ChatWindow orderId={order.id} />
                            </div>
                        </div>

                    </div>
                </motion.div>
            </div>
        </main>
    );
}
