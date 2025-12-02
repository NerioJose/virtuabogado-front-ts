/**
 * Componente para mostrar las órdenes recientes en el dashboard admin
 * Se actualiza automáticamente cuando hay nuevas compras
 */

'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiShoppingBag, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';

const statusConfig = {
    [OrderStatus.PENDING]: {
        label: 'Pendiente',
        icon: FiClock,
        color: 'text-yellow-600',
        bg: 'bg-yellow-100',
    },
    [OrderStatus.PROCESSING]: {
        label: 'Procesando',
        icon: FiClock,
        color: 'text-blue-600',
        bg: 'bg-blue-100',
    },
    [OrderStatus.COMPLETED]: {
        label: 'Completada',
        icon: FiCheckCircle,
        color: 'text-green-600',
        bg: 'bg-green-100',
    },
    [OrderStatus.CANCELLED]: {
        label: 'Cancelada',
        icon: FiAlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-100',
    },
    [OrderStatus.FAILED]: {
        label: 'Fallida',
        icon: FiAlertCircle,
        color: 'text-red-600',
        bg: 'bg-red-100',
    },
};

export default function RecentOrders() {
    const { orders, fetchOrders, isLoading, ordersCount, totalRevenue } = useOrders();

    useEffect(() => {
        // Cargar órdenes al montar
        fetchOrders();
    }, [fetchOrders]);

    // Mostrar solo las 5 órdenes más recientes
    const recentOrders = orders.slice(0, 5);

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-vinotinto/10 rounded-lg">
                        <FiShoppingBag className="w-6 h-6 text-vinotinto" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-azul-primario">Órdenes Recientes</h2>
                        <p className="text-sm text-gray-500">
                            {ordersCount} {ordersCount === 1 ? 'orden' : 'órdenes'} · ${totalRevenue.toFixed(2)} total
                        </p>
                    </div>
                </div>
                <button className="text-sm text-vinotinto hover:text-vinotinto/80 font-medium">
                    Ver todas →
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : recentOrders.length === 0 ? (
                <div className="text-center py-12">
                    <FiShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No hay órdenes todavía</p>
                    <p className="text-sm text-gray-400 mt-1">
                        Las órdenes aparecerán aquí cuando los usuarios realicen compras
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {recentOrders.map((order, index) => {
                        const config = statusConfig[order.status];
                        const StatusIcon = config.icon;

                        return (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-4 border border-gray-200 rounded-lg hover:border-azul-primario/30 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-semibold text-azul-primario">
                                                #{order.id}
                                            </span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} flex items-center gap-1`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {config.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-1">
                                            <strong>{order.userName}</strong>
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {order.userEmail}
                                        </p>
                                        <div className="mt-2">
                                            {order.items.map((item, i) => (
                                                <p key={i} className="text-sm text-gray-600">
                                                    {item.serviceName}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-vinotinto">
                                            ${order.total.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString('es-ES', {
                                                day: 'numeric',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
