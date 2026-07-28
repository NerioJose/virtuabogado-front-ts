/**
 * Servicio para gestionar órdenes
 * Maneja la comunicación con la API
 * TODO: Implementar con API real cuando esté disponible
 */

import {
    Order,
    CreateOrderRequest,
    UpdateOrderStatusRequest,
    OrdersFilters,
} from '../types/orders.types';

export const ordersService = {
    /**
     * Obtener todas las órdenes con filtros opcionales
     */
    async getAll(filters?: OrdersFilters & { page?: number; limit?: number }): Promise<{ data: Order[]; pagination: any }> {
        const params = new URLSearchParams();
        if (filters?.lawyerId) params.append('lawyerId', filters.lawyerId);
        if (filters?.userId) params.append('userId', filters.userId);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const response = await fetch(`/api/orders?${params.toString()}`, {
            cache: 'no-store'
        });
        if (!response.ok) throw new Error('Error fetching orders');
        return response.json();
    },

    /**
     * Obtener una orden por ID
     */
    async getById(orderId: string | number): Promise<Order | null> {
        try {
            const response = await fetch(`/api/orders/${orderId}`);
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error('Error fetching order');
            }
            return response.json();
        } catch (error) {
            console.error(`Error fetching order ${orderId}:`, error);
            throw error;
        }
    },

    /**
     * Crear una nueva orden (checkout público)
     */
    async create(orderData: CreateOrderRequest): Promise<Order> {
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || 'Error al crear la orden');
            }
            return response.json();
        } catch (error) {
            console.error('Error creating order:', error);
            throw error;
        }
    },

    /**
     * Crear una orden desde el panel admin
     */
    async createAdmin(data: {
        email: string;
        nombre?: string;
        telefono?: string;
        password?: string;
        servicio: string;
        total: number;
    }): Promise<Order> {
        const res = await fetch('/api/orders/admin-create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Error al crear el caso');
        }
        return res.json();
    },

    async updateStatus(data: UpdateOrderStatusRequest): Promise<Order> {
        try {
            const response = await fetch('/api/orders', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: data.orderId,
                    status: data.status,
                    notes: data.notes
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error updating order status');
            }

            return response.json();
        } catch (error) {
            console.error(`Error updating order ${data.orderId} status:`, error);
            throw error;
        }
    },

    /**
     * Obtener órdenes de un usuario específico
     */
    async getByUser(userId: number): Promise<Order[]> {
        try {
            // TODO: Implementar con API real
            
            return [];
        } catch (error) {
            console.error(`Error fetching orders for user ${userId}:`, error);
            throw error;
        }
    },

    /**
     * Eliminar una orden (solo admin)
     */
    async delete(orderId: number): Promise<void> {
        try {
            // TODO: Implementar con API real
            
        } catch (error) {
            console.error(`Error deleting order ${orderId}:`, error);
            throw error;
        }
    },
};
