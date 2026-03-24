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
     * Intenta registrar al usuario o loguearlo. 
     * Ahora más flexible para soportar pre-detección de usuario.
     */
    async registerOrLogin(userData: UserCheckoutData): Promise<{ user: any, isNewUser: boolean }> {
        const email = userData.email.trim();
        const { password, nombre, phone } = userData;

        // Si no hay contraseña (flujo OTP completado previamente en el componente)
        // intentamos obtener el usuario actual de auth
        if (!password) {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
                return { user, isNewUser: false };
            }
            throw new Error("Se requiere contraseña o autenticación previa para continuar.");
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
                    telefono: phone || ''
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Crear sesión en el cliente localmente
                await this.supabase.auth.signInWithPassword({ email, password });
                
                return { user: data.user, isNewUser: data.isNewUser };
            }
        } catch (apiError) {
            console.warn('⚠️ API error, fallback to client:', apiError);
        }

        // ESTRATEGIA 2: Cliente directo
        const { data: signInData } = await this.supabase.auth.signInWithPassword({ email, password });
        if (signInData.user) return { user: signInData.user, isNewUser: false };

        const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
            email,
            password,
            options: { data: { nombre: nombre || 'Usuario', telefono: phone || '', rol: 'CLIENTE' } }
        });

        if (signUpData.user && !signUpError) return { user: signUpData.user, isNewUser: true };

        if (signUpError?.message.includes('already registered')) {
            throw new Error("Usuario ya existe pero la contraseña es incorrecta. Usa la opción de 'Código de acceso'.");
        }

        throw new Error(signUpError?.message || "Error en la autenticación.");
    }

    /**
     * Envía un magic link al correo.
     * Guarda el estado del checkout en sessionStorage para restaurarlo después del redirect.
     */
    async sendOtp(email: string, checkoutState?: Record<string, unknown>): Promise<void> {
        // Guardar el estado del checkout antes de redirigir (usamos localStorage para soporte multi-pestaña)
        if (checkoutState && typeof window !== 'undefined') {
            localStorage.setItem('checkout_pending', JSON.stringify({
                ...checkoutState,
                timestamp: Date.now()
            }));
        }

        // El redirect apunta al callback para que Supabase establezca la sesión
        const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`;

        const { error } = await this.supabase.auth.signInWithOtp({
            email,
            options: {
                shouldCreateUser: false, // Solo para usuarios existentes
                emailRedirectTo: callbackUrl
            }
        });

        if (error) throw error;
    }

    /**
     * Verifica el código OTP
     */
    async verifyOtp(email: string, token: string): Promise<any> {
        const { data, error } = await this.supabase.auth.verifyOtp({
            email,
            token,
            type: 'magiclink' // Maneja tanto los links como los códigos de 6 dígitos
        });

        if (error) throw error;
        return data.user;
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
