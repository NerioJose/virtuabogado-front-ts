/**
 * Tipos para el feature de órdenes
 */

import { Servicio } from '@/shared/types/entities.types';

export enum OrderStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    FAILED = 'failed',
}

export enum PaymentMethod {
    CREDIT_CARD = 'credit_card',
    DEBIT_CARD = 'debit_card',
    PAYPAL = 'paypal',
    BANK_TRANSFER = 'bank_transfer',
    CASH = 'cash',
}

export interface OrderItem {
    id: number;
    serviceId: number;
    serviceName: string;
    price: number;
    quantity: number;
}

export interface Order {
    id: number;
    userId: number;
    userName: string;
    userEmail: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    transactionId?: string;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
    notes?: string;
}

export interface CreateOrderRequest {
    userId: number;
    userEmail: string;
    userName: string;
    service: Servicio;
    paymentMethod: PaymentMethod;
    transactionId?: string;
}

export interface UpdateOrderStatusRequest {
    orderId: number;
    status: OrderStatus;
    notes?: string;
}

export interface OrdersFilters {
    status?: OrderStatus;
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    searchQuery?: string;
}

export interface OrdersState {
    orders: Order[];
    isLoading: boolean;
    error: string | null;
    filters: OrdersFilters;

    // Actions
    addOrder: (order: Order) => void;
    fetchOrders: (filters?: OrdersFilters) => Promise<void>;
    updateOrderStatus: (orderId: number, status: OrderStatus, notes?: string) => void;
    getOrderById: (orderId: number) => Order | undefined;
    getOrdersByUser: (userId: number) => Order[];
    setFilters: (filters: OrdersFilters) => void;
    clearFilters: () => void;
    reset: () => void;
}
