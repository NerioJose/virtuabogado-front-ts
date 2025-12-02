import {
    UserCheckoutData,
    PaymentData,
    OrderResponse,
    PaymentMethod,
    PaymentRequest,
    PaymentResult
} from '../types/checkout.types';
import type { Servicio } from '@/shared/types/entities.types';

interface OrderRequest {
    serviceId: number;
    userId: number; // Cambiado a number
    paymentId: string;
    total: number;
}

class CheckoutService {
    /**
     * Verifica si un email ya existe en el sistema
     */
    async checkEmailExists(email: string): Promise<boolean> {
        try {
            // TODO: Integrar con API real
            // const response = await apiClient.get(`/users/check-email?email=${email}`);
            // return response.data.exists;

            console.log('Checking email:', email);

            // Revisar localStorage para simular verificación
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const exists = users.some((u: { email: string }) => u.email === email);

            console.log('Email exists in system:', exists);
            return exists;
        } catch (error) {
            console.error('Error checking email:', error);
            return false; // En caso de error, asumir que no existe
        }
    }

    /**
     * Auto-login silencioso para usuarios existentes
     */
    async autoLogin(email: string): Promise<void> {
        try {
            // TODO: Integrar con authService existente
            // await authService.login(email, temporaryPassword);

            console.log('Auto-login for:', email);
            // Simulación
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Error in auto-login:', error);
            throw new Error('No se pudo iniciar sesión automáticamente');
        }
    }

    /**
     * Auto-registro para nuevos usuarios
     */
    async autoRegister(userData: UserCheckoutData): Promise<void> {
        try {
            // TODO: Integrar con authService existente
            // const tempPassword = generateTemporaryPassword();
            // await authService.register({ ...userData, password: tempPassword });
            // await emailService.sendWelcomeEmail(userData.email, tempPassword);

            console.log('Auto-register for:', userData.email);

            // Simulación: guardar en localStorage
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            users.push({
                email: userData.email,
                name: userData.name,
                phone: userData.phone,
                createdAt: new Date().toISOString(),
            });
            localStorage.setItem('users', JSON.stringify(users));

            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error('Error in auto-register:', error);
            throw new Error('No se pudo crear la cuenta automáticamente');
        }
    }

    /**
     * Procesa el pago
     */
    async processPayment(request: PaymentRequest): Promise<PaymentResult> {
        try {
            // TODO: Integrar con gateway de pago real (Stripe, PayPal, etc.)
            // const response = await paymentGateway.processPayment({
            //   amount: request.service.precio,
            //   method: request.paymentMethod,
            //   card: request.paymentData,
            // });

            console.log('Processing payment for:', request.service.nombre);

            // Simulación de procesamiento
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Validación básica del número de tarjeta (solo para simulación)
            const cardNumber = request.paymentData.cardNumber.replace(/\s/g, '');
            if (cardNumber.length < 15 || cardNumber.length > 16) {
                throw new Error('Número de tarjeta inválido');
            }

            // Generar IDs numéricos
            const timestamp = Date.now();
            const userId = timestamp % 1000000; // ID numérico de 6 dígitos

            return {
                paymentId: `PAY-${timestamp}`,
                userId: userId, // Ahora es un número
                status: 'approved',
                // Agregar datos del usuario para nuevos registros
                user: !request.isExistingUser && request.createAccount ? {
                    id: userId,
                    email: request.email,
                    nombre: request.nombre || '',
                    rol: 'cliente' as const,
                } : undefined,
            };
        } catch (error) {
            console.error('Error processing payment:', error);
            throw error instanceof Error ? error : new Error('Error al procesar el pago');
        }
    }

    /**
     * Crea la orden en el sistema
     */
    async createOrder(orderData: OrderRequest): Promise<OrderResponse> {
        try {
            // TODO: Integrar con API real
            // const response = await apiClient.post('/orders', orderData);
            // return response.data;

            console.log('Creating order:', orderData);

            // Simulación
            await new Promise(resolve => setTimeout(resolve, 500));

            const timestamp = Date.now();
            const numericOrderId = timestamp % 1000000; // ID numérico
            const orderId = `ORD-${timestamp}`;

            // Guardar en localStorage para demo
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            orders.push({
                ...orderData,
                orderId,
                numericId: numericOrderId,
                status: 'completed',
                createdAt: new Date().toISOString(),
            });
            localStorage.setItem('orders', JSON.stringify(orders));

            return {
                orderId,
                status: 'success',
                message: 'Orden creada exitosamente',
            };
        } catch (error) {
            console.error('Error creating order:', error);
            throw new Error('No se pudo crear la orden');
        }
    }

    /**
     * Envía email de confirmación
     */
    async sendConfirmationEmail(orderId: string): Promise<void> {
        try {
            // TODO: Integrar con servicio de emails
            // await emailService.sendOrderConfirmation(orderId);

            console.log('Sending confirmation email for order:', orderId);
            await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
            // No lanzamos error aquí, solo logueamos
            console.error('Error sending confirmation email:', error);
        }
    }

    /**
     * Genera un password temporal
     */
    private generateTemporaryPassword(): string {
        return Math.random().toString(36).slice(-8);
    }
}

export const checkoutService = new CheckoutService();
