/**
 * Store global de órdenes - Zustand
 * Gestiona todas las órdenes de la aplicación
 * Se actualiza automáticamente cuando hay nuevas compras desde checkout
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Order, OrdersState, OrdersFilters, OrderStatus } from '../types/orders.types';
import { apiClient } from '@/lib/apiClient';

const initialState = {
    orders: [],
    isLoading: false,
    error: null,
    filters: {},
};

export const useOrdersStore = create<OrdersState>()(
    // @ts-ignore
    persist(
        (set, get) => ({
            ...initialState,

            // ============ Acciones ============

            addOrder: (order: Order) => {
                console.log('🔥 ordersStore.addOrder() llamado con:', order);
                console.log('🔥 Estado actual antes de agregar:', get().orders.length, 'orders');

                set((state) => ({
                    orders: [...state.orders, order],
                    error: null,
                }));

                console.log('🔥 Estado después de agregar:', get().orders.length, 'orders');
                console.log('🔥 Nueva orden en el array:', get().orders[get().orders.length - 1]);
            },

            setOrders: (orders: Order[]) => {
                set({ orders, isLoading: false, error: null });
            },

            upsertOrder: (order: Order) => {
                set((state) => {
                    const exists = state.orders.some((o) => o.id === order.id);
                    if (exists) {
                        return {
                            orders: state.orders.map((o) => (o.id === order.id ? { ...o, ...order } : o)),
                        };
                    }
                    return {
                        orders: [...state.orders, order],
                    };
                });
            },

            updateOrder: (orderId: string, updates: Partial<Order>) => {
                set((state) => ({
                    orders: state.orders.map((o) => (o.id === orderId ? { ...o, ...updates } : o)),
                }));
            },

            fetchOrders: async (filters?: OrdersFilters) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Implement                try {
                    const orders = await apiClient.get<Order[]>('/api/orders');

                    set({
                        orders,
                        isLoading: false,
                        error: null,
                    });

                    console.log('✅ OrdersStore: Loaded', orders.length, 'orders from API');
                } catch (error) {
                    console.error('❌ OrdersStore: Error fetching orders:', error);
                    set({
                        isLoading: false,
                        error: 'Error al cargar las órdenes'
                    });
                }
            },

            updateOrderStatus: async (orderId: string, status: OrderStatus, notes?: string) => {
                try {
                    set({ isLoading: true, error: null });
                    await apiClient.put(`/api/orders`, { id: orderId, status });

                    set((state) => ({
                        orders: state.orders.map((order) =>
                            order.id === orderId
                                ? {
                                    ...order,
                                    status,
                                    notes,
                                    updatedAt: new Date(),
                                    completedAt: status === OrderStatus.COMPLETADO ? new Date() : order.completedAt,
                                }
                                : order
                        ),
                        isLoading: false,
                    }));
                    console.log('✅ OrdersStore: Order status updated in API:', orderId);
                } catch (error) {
                    console.error('❌ OrdersStore: Error updating order status:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Error al actualizar el estado de la orden',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            assignLawyer: async (orderId: string, lawyerId: string) => {
                try {
                    set({ isLoading: true, error: null });
                    await apiClient.put(`/api/orders`, { id: orderId, lawyerId });

                    set((state) => ({
                        orders: state.orders.map((order) =>
                            order.id === orderId
                                ? {
                                    ...order,
                                    lawyerId,
                                    assignedAt: new Date(),
                                    updatedAt: new Date(),
                                }
                                : order
                        ),
                        isLoading: false,
                    }));
                    console.log(`✅ OrdersStore: Lawyer ${lawyerId} assigned to order ${orderId}`);
                } catch (error) {
                    console.error('❌ OrdersStore: Error assigning lawyer:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Error al asignar abogado',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            deleteOrder: async (id: string) => {
                try {
                    set({ isLoading: true, error: null });
                    await apiClient.delete(`/api/orders?id=${id}`);

                    set((state) => ({
                        orders: state.orders.filter((order) => order.id !== id),
                        isLoading: false,
                    }));
                    console.log('✅ OrdersStore: Order deleted in API (logic delete):', id);
                } catch (error) {
                    console.error('❌ OrdersStore: Error deleting order:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Error al eliminar la orden',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            getOrderById: (orderId: string) => {
                return get().orders.find((order) => order.id === orderId);
            },

            getOrdersByUser: (userId: string) => {
                return get().orders.filter((order) => order.userId === userId);
            },

            getOrdersByLawyer: (lawyerId: string) => {
                return get().orders.filter((order) => order.lawyerId === lawyerId);
            },

            setFilters: (filters: OrdersFilters) => {
                set({ filters });
            },

            clearFilters: () => {
                set({ filters: {} });
            },

            reset: () => {
                set(initialState);
            },
        }),
        {
            name: 'virtuabogado-orders-v2', // v2 para limpiar datos mock del localStorage
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => {
                console.log('🔄 OrdersStore: Iniciando rehydration desde localStorage');
                return (state, error) => {
                    if (error) {
                        console.error('❌ OrdersStore: Error en rehydration:', error);
                    } else {
                        console.log('✅ OrdersStore: Rehydration completada. Orders:', state?.orders.length || 0);
                    }
                };
            },
            // Removido partialize - causaba problemas de persistencia
        }
    )
);

// Función para inicializar órdenes desde la API
export const initializeOrders = () => {
    const store = useOrdersStore.getState();

    // Disparar carga inicial desde la API
    console.log('🔄 OrdersStore: Inicializando datos desde la API...');
    store.fetchOrders();
};
