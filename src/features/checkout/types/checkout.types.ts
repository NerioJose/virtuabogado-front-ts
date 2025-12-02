import { Servicio } from '@/shared/types/entities.types';

// Pasos del checkout
export type CheckoutStep = 1 | 2 | 3;

// Datos del usuario para el checkout
export interface UserCheckoutData {
    email: string;
    name: string;
    nombre: string; // Alias para compatibilidad
    phone?: string;
    createAccount: boolean;
}

// Datos de pago
export interface PaymentData {
    cardNumber: string;
    cardHolder: string;
    expiryDate: string;
    cvv: string;
    saveCard?: boolean;
}

// Método de pago
export type PaymentMethod = 'card' | 'paypal' | 'transfer';

// Solicitud de pago
export interface PaymentRequest {
    service: Servicio;
    paymentData: PaymentData;
    paymentMethod: PaymentMethod;
    // Agregar campos necesarios para la integración
    email: string;
    nombre: string;
    isExistingUser: boolean;
    createAccount: boolean;
}

// Estado completo del checkout
export interface CheckoutData {
    service: Servicio | null;
    userData: UserCheckoutData | null;
    paymentData: PaymentData | null;
    paymentMethod: PaymentMethod;
    orderId?: string;
    total: number;
}

// Estado del store
export interface CheckoutState extends CheckoutData {
    step: CheckoutStep;
    isOpen: boolean;
    isLoading: boolean;
    error: string | null;
    isExistingUser: boolean;

    // Actions
    openCheckout: (service: Servicio) => void;
    closeCheckout: () => void;
    setStep: (step: CheckoutStep) => void;
    setUserData: (data: UserCheckoutData) => void;
    setPaymentData: (data: PaymentData) => void;
    setPaymentMethod: (method: PaymentMethod) => void;
    checkExistingUser: (email: string) => Promise<boolean>;
    submitOrder: () => Promise<void>;
    reset: () => void;
}

// Respuesta del servidor al crear orden
export interface OrderResponse {
    orderId: string;
    status: 'success' | 'pending' | 'failed';
    message: string;
    paymentUrl?: string;
}

// Resultado del procesamiento de pago
export interface PaymentResult {
    paymentId: string;
    userId: number; // Cambiado a number
    status: 'approved' | 'pending' | 'rejected';
    // Usuario opcional para nuevos registros
    user?: {
        id: number;
        email: string;
        nombre: string;
        rol: 'cliente';
    };
}

// Datos guardados en localStorage
export interface CheckoutStorageData {
    service: Servicio | null;
    userData: UserCheckoutData | null;
    step: CheckoutStep;
    timestamp: number;
}
