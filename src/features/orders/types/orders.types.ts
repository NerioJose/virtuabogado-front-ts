/**
 * Tipos para el feature de órdenes
 */

import { Servicio } from '@/shared/types/entities.types';

export enum OrderStatus {
    PENDING = 'PENDIENTE',
    PROCESSING = 'EN_PROGRESO',
    COMPLETED = 'COMPLETADO',
    CANCELLED = 'CANCELADO',
    FAILED = 'FALLIDO',
}

export enum PaymentMethod {
    CREDIT_CARD = 'credit_card',
    DEBIT_CARD = 'debit_card',
    PAYPAL = 'paypal',
    BANK_TRANSFER = 'bank_transfer',
    CASH = 'cash',
}

export interface OrderItem {
    id: string;
    serviceId: number;
    serviceName: string;
    price: number;
    quantity: number;
}

export interface Order {
    id: string;
    numericId: number;
    userId: string; // UUID
    lawyerId?: string; // Abogado asignado
    lawyerName?: string; // Nombre del abogado asignado
    userName: string;
    userEmail: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    total: number;
    status: OrderStatus;
    paymentMethod: PaymentMethod;
    transactionId?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    completedAt?: string | Date;
    assignedAt?: string | Date;
    notes?: string;
    // Campos anidados de Prisma
    user?: {
        id: string;
        nombre: string;
        email: string;
    };
    service?: {
        id: number;
        titulo: string;
        precio: number;
    };
}

export interface CreateOrderRequest {
    userId: string;
    userEmail: string;
    userName: string;
    service: Servicio;
    paymentMethod: PaymentMethod;
    transactionId?: string;
}

export interface UpdateOrderStatusRequest {
    orderId: string;
    status: OrderStatus;
    notes?: string;
}

export interface OrdersFilters {
    status?: OrderStatus;
    lawyerId?: string;
    userId?: string;
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
    setOrders: (orders: Order[]) => void;
    fetchOrders: (filters?: OrdersFilters) => Promise<void>;
    updateOrderStatus: (orderId: string, status: OrderStatus, notes?: string) => Promise<void>;
    assignLawyer: (orderId: string, lawyerId: string) => Promise<void>;
    deleteOrder: (id: string) => Promise<void>;
    getOrderById: (orderId: string) => Order | undefined;
    getOrdersByUser: (userId: string) => Order[];
    getOrdersByLawyer: (lawyerId: string) => Order[];
    setFilters: (filters: OrdersFilters) => void;
    clearFilters: () => void;
    reset: () => void;
}
