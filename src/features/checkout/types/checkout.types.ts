import { Servicio } from '@/shared/types/entities.types';

// Pasos del checkout
export type CheckoutStep = 1 | 2 | 3;

// Datos del usuario para el checkout
export interface UserCheckoutData {
    email: string;
    name: string;
    nombre: string;
    phone?: string;
    password?: string; // Para registro
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
    userId?: string; // UUID opcional para usuarios logueados
}

// Estado completo del checkout
export interface CheckoutData {
    service: Servicio | null;
    userData: UserCheckoutData | null;
    paymentData: PaymentData | null;
    paymentMethod: PaymentMethod;
    orderId?: string;
    total: number;
    completedAt?: string | null;  // Timestamp de compra exitosa
}

// Estado del store
export interface CheckoutState extends CheckoutData {
    step: CheckoutStep;
    isOpen: boolean;
    isLoading: boolean;
    error: string | null;
    isExistingUser: boolean;
    existingUserId: string | null;
    tempPassword: string | null;
    completedAt: string | null;  // Timestamp cuando se completó exitosamente
    isProcessingPayment: boolean; // Indica si el usuario hizo clic en pagar
    isWaitingForWebhook: boolean; // Indica si estamos esperando la confirmación de la pasarela

    // Actions
    openCheckout: (service: Servicio) => void;
    closeCheckout: () => void;
    setStep: (step: CheckoutStep) => void;
    setUserData: (data: UserCheckoutData) => void;
    setPaymentData: (data: PaymentData) => void;
    setPaymentMethod: (method: PaymentMethod) => void;
    setIsProcessingPayment: (val: boolean) => void;
    setIsWaitingForWebhook: (val: boolean) => void;
    setOrderId: (orderId: string) => void;
    checkUserExists: (email: string) => Promise<boolean>;
    sendOtp: (email: string) => Promise<void>;
    verifyOtp: (email: string, token: string) => Promise<void>;
    authenticateUser: (data: UserCheckoutData) => Promise<boolean>;
    submitOrder: () => Promise<void>;
    markAsCompleted: () => void;
    reset: () => void;
}

// Respuesta del servidor al crear orden
export interface OrderResponse {
    orderId: string;
    numericId?: number;
    uuid?: string;
    status: 'success' | 'pending' | 'failed';
    message: string;
    paymentUrl?: string;
}

// Resultado del procesamiento de pago
export interface PaymentResult {
    paymentId: string;
    userId: string; // Cambiado a string (UUID)
    status: 'approved' | 'pending' | 'rejected';
    // Usuario opcional para nuevos registros
    user?: {
        id: string; // Cambiado a string (UUID)
        email: string;
        nombre: string;
        rol: import('@/shared/types/entities.types').UserRole;
    };
}

// Datos guardados en localStorage
export interface CheckoutStorageData {
    service: Servicio | null;
    userData: UserCheckoutData | null;
    step: CheckoutStep;
    timestamp: number;
}
