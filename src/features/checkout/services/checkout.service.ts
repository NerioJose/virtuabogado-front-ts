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

class CheckoutService {
    private supabase = createClient();

    /**
     * Intenta registrar al usuario usando el API server-side primero.
     * Si falla, usa cliente directo con delay para evitar rate limits.
     */
    async registerOrLogin(userData: UserCheckoutData): Promise<{ user: any, isNewUser: boolean }> {
        const email = userData.email.trim();
        const { password, nombre, phone } = userData;

        if (!password) {
            throw new Error("Se requiere contraseña para crear la cuenta o iniciar sesión.");
        }

        // ESTRATEGIA 1: Intentar API server-side (sin rate limits)
        console.log('🔐 Intentando registro via API server-side:', email);

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    nombre: nombre || 'Usuario',
                    telefono: phone || ''
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${data.isNewUser ? 'Registro' : 'Login'} exitoso (server-side):`, data.user.id);

                // Crear sesión en el cliente
                const { error: signInError } = await this.supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (signInError) {
                    console.warn('⚠️ Error al crear sesión cliente:', signInError.message);
                }

                return {
                    user: data.user,
                    isNewUser: data.isNewUser
                };
            } else {
                const errorData = await response.json();
                console.warn('⚠️ API server-side falló:', errorData.error);
                // Continuar con fallback
            }
        } catch (apiError) {
            console.warn('⚠️ API server-side no disponible, usando fallback:', apiError);
        }

        // ESTRATEGIA 2: Fallback a cliente directo (con delay para evitar rate limits)
        console.log('🔄 Usando autenticación cliente directa...');

        // Delay de 1 segundo para evitar rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Intentar login primero
        const { data: signInData, error: signInError } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });

        if (signInData.user && !signInError) {
            console.log('✅ Login exitoso (cliente):', signInData.user.id);
            return { user: signInData.user, isNewUser: false };
        }

        // Si login falla, intentar registro
        const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre: nombre || 'Usuario',
                    telefono: phone || '',
                    rol: 'CLIENTE'
                }
            }
        });

        if (signUpData.user && !signUpError) {
            console.log('✨ Usuario registrado (cliente):', signUpData.user.id);
            return { user: signUpData.user, isNewUser: true };
        }

        // Manejo de errores
        if (signUpError) {
            if (signUpError.message.includes('already registered')) {
                throw new Error("Usuario ya existe pero la contraseña es incorrecta.");
            }
            if (signUpError.message.toLowerCase().includes('rate limit')) {
                throw new Error("Demasiados registros. Por favor espera 1 minuto e intenta de nuevo, o usa una cuenta existente.");
            }
            throw new Error(signUpError.message || "Error al crear la cuenta.");
        }

        throw new Error("Error inesperado en autenticación.");
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
            console.log('📤 Creando orden via API:', orderData);

            const response = await apiClient.post<any>('/api/orders', {
                serviceId: orderData.serviceId,
                userId: orderData.userId,
                total: orderData.total,
                paymentId: orderData.paymentId
            });

            console.log('✅ Orden creada exitosamente:', response);

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
        console.log('📧 (Simulado) Enviando email para orden:', orderId);
    }
}

export const checkoutService = new CheckoutService();
