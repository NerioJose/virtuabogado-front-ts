'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiCalendar, FiDollarSign, FiFileText, FiClock, FiUser } from 'react-icons/fi';
import { useAuthStore } from '@/features/auth';
// import { useOrdersStore } from '@/features/orders';
import { useOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import logo from '../../../../public/logo/logo_sf_1.png';

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

    const statusConfig = {
        [OrderStatus.PENDING]: { color: 'bg-yellow-100 text-yellow-800', text: 'Pendiente de asignación' },
        [OrderStatus.PROCESSING]: { color: 'bg-blue-100 text-blue-800', text: 'En proceso' },
        [OrderStatus.COMPLETED]: { color: 'bg-green-100 text-green-800', text: 'Completado' },
        [OrderStatus.CANCELLED]: { color: 'bg-red-100 text-red-800', text: 'Cancelado' },
        [OrderStatus.FAILED]: { color: 'bg-red-100 text-red-800', text: 'Fallido' },
    };

    const status = statusConfig[order.status] || statusConfig[OrderStatus.PENDING];

    return (
        <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link href="/" className="inline-block mb-4">
                        <Image
                            src={logo}
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
                                <p className="text-blue-100">Orden #{order.id}</p>
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
                                        <p className="font-semibold text-gray-900">${order.total.toFixed(2)}</p>
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
                                {order.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center">
                                        <div>
                                            <p className="font-medium text-gray-900">{item.serviceName}</p>
                                            <p className="text-sm text-gray-600">Cantidad: {item.quantity}</p>
                                        </div>
                                        <p className="font-semibold text-azul-primario">${item.price.toFixed(2)}</p>
                                    </div>
                                ))}
                                <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
                                    <p className="font-semibold text-gray-900">Total</p>
                                    <p className="text-xl font-bold text-azul-primario">${order.total.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Siguiente pasos según estado */}
                        <div className="border-t border-gray-200 pt-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Próximos Pasos</h3>
                            {order.status === OrderStatus.PENDING && (
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

                            {order.status === OrderStatus.PROCESSING && (
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                    <div className="flex items-start">
                                        <FiUser className="text-blue-600 mt-1 mr-3 flex-shrink-0" />
                                        <div>
                                            <p className="font-medium text-blue-900">Servicio en proceso</p>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Un abogado está trabajando en tu caso. Recibirás actualizaciones por email.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {order.status === OrderStatus.COMPLETED && (
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
                    </div>
                </motion.div>
            </div>
        </main>
    );
}
