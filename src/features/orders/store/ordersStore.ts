/**
 * Store global de órdenes - Zustand
 * Gestiona todas las órdenes de la aplicación
 * Se actualiza automáticamente cuando hay nuevas compras desde checkout
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Order, OrdersState, OrdersFilters, OrderStatus } from '../types/orders.types';

const initialState = {
    orders: [],
    isLoading: false,
    error: null,
    filters: {},
};

export const useOrdersStore = create<OrdersState>()(
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

            fetchOrders: async (filters?: OrdersFilters) => {
                // NO hacer nada aquí - Zustand persist ya carga desde localStorage
                // Si intentamos hacer set() con array vacío, BORRA todos los datos!
                // TODO: Cuando tengamos API real, aquí irá la llamada

                console.log('⚠️ fetchOrders llamado - ignorando para preservar datos de localStorage');

                // Solo actualizar filters si se proporcionan
                if (filters) {
                    set({ filters });
                }
            },

            updateOrderStatus: (orderId: number, status: OrderStatus, notes?: string) => {
                set((state) => ({
                    orders: state.orders.map((order) =>
                        order.id === orderId
                            ? {
                                ...order,
                                status,
                                notes,
                                updatedAt: new Date(),
                                completedAt: status === OrderStatus.COMPLETED ? new Date() : order.completedAt,
                            }
                            : order
                    ),
                }));
            },

            getOrderById: (orderId: number) => {
                return get().orders.find((order) => order.id === orderId);
            },

            getOrdersByUser: (userId: number) => {
                return get().orders.filter((order) => order.userId === userId);
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

// ============ CROSS-TAB SYNCHRONIZATION ============
// Escuchar cambios en localStorage desde otras pestañas
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'virtuabogado-orders-v2' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                if (data.state && data.state.orders) {
                    console.log('🔄 OrdersStore: Sincronizando desde otra pestaña. Orders:', data.state.orders.length);
                    useOrdersStore.setState({ orders: data.state.orders });
                }
            } catch (error) {
                console.error('Error sincronizando ordersStore:', error);
            }
        }
    });
}

// Función para inicializar órdenes - SIN mock data
export const initializeOrders = () => {
    const store = useOrdersStore.getState();

    // Solo cargar desde localStorage si existe
    // Las órdenes se agregan automáticamente desde el checkout
    console.log('OrdersStore initialized:', store.orders.length, 'orders');
};
