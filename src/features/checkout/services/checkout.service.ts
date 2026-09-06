import {
    UserCheckoutData,
    OrderResponse,
    PaymentRequest,
    PaymentResult
} from '../types/checkout.types';
import { apiClient } from '@/lib/apiClient';
import { createClient } from '@/utils/supabase/client';

interface OrderRequest {
    serviceId: number;
    userId: string;
    paymentId: string;
    total: number;
}

/**
 * Error tipado: el email existe pero aún no fue confirmado.
 */
export class EmailNotConfirmedError extends Error {
    code: string = 'email_not_confirmed';

    constructor(email: string) {
        super('Tu correo aún no ha sido confirmado. Revisa tu bandeja y pulsa el enlace de confirmación.');
        this.name = 'EmailNotConfirmedError';
    }
}

class CheckoutService {
    private supabase = createClient();

    /**
     * Intenta registrar al usuario o loguearlo.
     * Para usuarios nuevos (clientes) devuelve requiresEmailConfirmation.
     */
    async registerOrLogin(userData: UserCheckoutData): Promise<{ user: any, isNewUser: boolean, requiresEmailConfirmation?: boolean }> {
        const email = userData.email.trim();
        const { password, nombre, phone } = userData;

        if (!password) {
            throw new Error('Se requiere contraseña para continuar.');
        }

        // ESTRATEGIA 1: Intentar API server-side
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    nombre: nombre || 'Usuario',
                    telefono: phone || '',
                    turnstileToken: (userData as any).turnstileToken || ''
                })
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                // Nuevo cliente: requiere confirmación de email antes de crear sesión
                if (data.requiresEmailConfirmation) {
                    return { user: data.user, isNewUser: true, requiresEmailConfirmation: true };
                }

                // Usuario existente aunque: crear sesión
                await this.supabase.auth.signInWithPassword({ email, password });
                return { user: data.user, isNewUser: data.isNewUser, requiresEmailConfirmation: false };
            }

            if (data?.error && response.status < 500) {
                console.warn('⚠️ API error capturado:', data.error);
            }
        } catch (apiError) {
            console.warn('⚠️ API error, fallback to client:', apiError);
        }

        // ESTRATEGIA 2: Cliente directo (login de usuarios existentes)
        const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({ email, password });
        if (signInData.user) return { user: signInData.user, isNewUser: false, requiresEmailConfirmation: false };

        if (signInError?.code === 'email_not_confirmed' || signInError?.message?.toLowerCase().includes('not confirmed')) {
            throw new EmailNotConfirmedError(email);
        }

        throw new Error(signInError?.message || "Error en la autenticación.");
    }

    /**
     * Verifica si un email ya existe en el sistema
     */
    async checkUserExists(email: string): Promise<boolean> {
        try {
            const response = await fetch(`/api/auth/check-user?email=${encodeURIComponent(email)}`);
            if (!response.ok) return false;
            const data = await response.json();
            return data.exists;
        } catch {
            return false;
        }
    }

    /**
     * Procesa el pago (Simulado)
     */
    async processPayment(request: PaymentRequest): Promise<PaymentResult> {
        // MOCK: Aquí iría la integración con Stripe/PayPal
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simular latencia de red

        return {
            paymentId: `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: request.userId ?? '',
            status: 'approved'
        };
    }

    /**
     * Crea la orden en el sistema (Supabase DB via API o directa)
     */
    async createOrder(orderData: OrderRequest): Promise<OrderResponse> {
        try {
            

            const response = await apiClient.post<any>('/api/orders', {
                serviceId: orderData.serviceId,
                userId: orderData.userId,
                total: orderData.total,
                paymentId: orderData.paymentId
            });

            

            return {
                orderId: response.uuid || response.id, // API returns both
                status: 'success',
                message: 'Orden creada exitosamente'
            };

        } catch (error: any) {
            console.error('❌ Error creating order via API:', error);
            throw new Error(error.message || "Error al procesar la orden en el servidor.");
        }
    }

    async sendConfirmationEmail(orderId: string): Promise<void> {
        
    }
}

export const checkoutService = new CheckoutService();
