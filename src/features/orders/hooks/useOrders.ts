/**
 * Hook personalizado para gestionar órdenes
 * Wrapper conveniente sobre ordersStore
 */

import { useOrdersStore } from '../store/ordersStore';
import { OrderStatus } from '../types/orders.types';

export const useOrders = () => {
    const orders = useOrdersStore((state) => state.orders);
    const isLoading = useOrdersStore((state) => state.isLoading);
    const error = useOrdersStore((state) => state.error);
    const filters = useOrdersStore((state) => state.filters);

    const addOrder = useOrdersStore((state) => state.addOrder);
    const fetchOrders = useOrdersStore((state) => state.fetchOrders);
    const updateOrderStatus = useOrdersStore((state) => state.updateOrderStatus);
    const getOrderById = useOrdersStore((state) => state.getOrderById);
    const getOrdersByUser = useOrdersStore((state) => state.getOrdersByUser);
    const setFilters = useOrdersStore((state) => state.setFilters);
    const clearFilters = useOrdersStore((state) => state.clearFilters);
    const reset = useOrdersStore((state) => state.reset);

    // Computed values
    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING);
    const completedOrders = orders.filter((o) => o.status === OrderStatus.COMPLETED);
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
    const ordersCount = orders.length;

    return {
        // State
        orders,
        isLoading,
        error,
        filters,

        // Actions
        addOrder,
        fetchOrders,
        updateOrderStatus,
        getOrderById,
        getOrdersByUser,
        setFilters,
        clearFilters,
        reset,

        // Computed
        pendingOrders,
        completedOrders,
        totalRevenue,
        ordersCount,
    };
};
