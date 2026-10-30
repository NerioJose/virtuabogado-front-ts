import { apiFetch, readJson } from '@/lib/api';
import {
    UserCheckoutData,
    OrderResponse,
    PaymentRequest,
    PaymentResult
} from '../types/checkout.types';
import { apiClient } from '@/lib/apiClient';
import { AuthApiResponse, SupabaseUserLike } from '@/features/auth/types/auth.types';
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

    constructor() {
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
    async registerOrLogin(
        userData: UserCheckoutData,
    ): Promise<{
        user: SupabaseUserLike;
        isNewUser: boolean;
        requiresEmailConfirmation?: boolean;
    }> {
        const email = userData.email.trim();
        const { password, nombre, phone } = userData;

        if (!password) {
            throw new Error('Se requiere contraseña para continuar.');
        }

        // ESTRATEGIA 1: Intentar API server-side
        try {
            const response = await apiFetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    password,
                    nombre: nombre || 'Usuario',
                    telefono: phone || '',
                    turnstileToken: userData.turnstileToken || ''
                })
            });

            const data = await readJson<AuthApiResponse>(response).catch(
                (): AuthApiResponse => ({}),
            );

            if (response.ok) {
                // Nuevo cliente: requiere confirmación de email antes de crear sesión
                if (data.requiresEmailConfirmation) {
                    if (!data.user) {
                        throw new Error('No se pudo obtener el usuario registrado');
                    }
                    return {
                        user: data.user,
                        isNewUser: true,
                        requiresEmailConfirmation: true,
                    };
                }

                // Usuario existente: crear sesión
                const signIn = await this.supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                const user = data.user ?? signIn.data.user;
                if (!user) {
                    throw new Error('No se pudo iniciar sesión con el usuario registrado');
                }
                return {
                    user,
                    isNewUser: data.isNewUser ?? false,
                    requiresEmailConfirmation: false,
                };
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
            throw new EmailNotConfirmedError();
        }

        throw new Error(signInError?.message || "Error en la autenticación.");
    }

    /**
     * Verifica si un email ya existe en el sistema
     */
    async checkUserExists(email: string): Promise<boolean> {
        try {
            const response = await apiFetch(`/api/auth/check-user?email=${encodeURIComponent(email)}`);
            if (!response.ok) return false;
            const data = await readJson<{ exists?: boolean }>(response);
            return data.exists === true;
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
            

            interface CreatedOrder {
                uuid?: string;
                id?: string;
            }

            const response = await apiClient.post<CreatedOrder>('/api/orders', {
                serviceId: orderData.serviceId,
                userId: orderData.userId,
                total: orderData.total,
                paymentId: orderData.paymentId,
            });

            const orderId = response.uuid ?? response.id;
            if (!orderId) {
                throw new Error('La API no devolvió el ID de la orden');
            }

            return {
                orderId,
                status: 'success',
                message: 'Orden creada exitosamente',
            };

        } catch (error: unknown) {
            console.error('❌ Error creating order via API:', error);
            throw new Error(
                error instanceof Error
                    ? error.message
                    : 'Error al procesar la orden en el servidor.',
            );
        }
    }

    async sendConfirmationEmail(): Promise<void> {
        
    }
}

export const checkoutService = new CheckoutService();
