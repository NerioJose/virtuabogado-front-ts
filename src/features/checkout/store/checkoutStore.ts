import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { CheckoutState, CheckoutStep, UserCheckoutData, PaymentData, PaymentMethod } from '../types/checkout.types';
import type { Servicio } from '@/shared/types/entities.types';
import { checkoutService } from '../services/checkout.service';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrdersStore } from '@/features/orders/store/ordersStore';
import { useClientsStore } from '@/features/clients';
import { OrderStatus, PaymentMethod as OrderPaymentMethod } from '@/features/orders/types/orders.types';
import { ClientStatus } from '@/features/clients/types/clients.types';

const initialState = {
    service: null,
    userData: null,
    paymentData: null,
    paymentMethod: 'card' as PaymentMethod,
    orderId: undefined,
    total: 0,
    step: 1 as CheckoutStep,
    isOpen: false,
    isLoading: false,
    error: null,
    isExistingUser: false,
};

export const useCheckoutStore = create<CheckoutState>()(
    devtools(
        (set, get) => ({
            ...initialState,

            openCheckout: (service: Servicio) => {
                console.log('🛒 openCheckout llamado con servicio:', service);
                console.log('  - ID:', service.id);
                console.log('  - Nombre:', service.nombre);
                console.log('  - Precio:', service.precio);

                set({
                    isOpen: true,
                    service,
                    total: service.precio || 0,
                    step: 1,
                    error: null,
                });
            },

            closeCheckout: () => {
                // Solo cerramos, no reseteamos para permitir recovery
                set({ isOpen: false });
            },

            setStep: (step: CheckoutStep) => {
                set({ step, error: null });
            },

            setUserData: (data: UserCheckoutData) => {
                // Normalizar name/nombre
                const normalizedData = {
                    ...data,
                    nombre: data.nombre || data.name, // Asegurar que nombre siempre exista
                };
                set({ userData: normalizedData });
            },

            setPaymentData: (paymentData: PaymentData) => {
                set({ paymentData });
            },

            setPaymentMethod: (paymentMethod: PaymentMethod) => {
                set({ paymentMethod });
            },

            checkExistingUser: async (email: string) => {
                try {
                    const exists = await checkoutService.checkEmailExists(email);
                    set({ isExistingUser: exists });
                    return exists;
                } catch (error) {
                    console.error('Error checking user:', error);
                    return false;
                }
            },

            submitOrder: async () => {
                const state = get();

                if (!state.service || !state.userData || !state.paymentData) {
                    set({ error: 'Datos incompletos' });
                    return;
                }

                set({ isLoading: true, error: null });

                try {
                    // 1. Auto-login o auto-registro
                    if (state.isExistingUser) {
                        await checkoutService.autoLogin(state.userData.email);
                    } else if (state.userData.createAccount) {
                        await checkoutService.autoRegister(state.userData);
                    }

                    // 2. Procesar pago
                    const paymentResult = await checkoutService.processPayment({
                        service: state.service,
                        paymentData: state.paymentData,
                        paymentMethod: state.paymentMethod,
                        // Agregar campos adicionales
                        email: state.userData.email,
                        nombre: state.userData.nombre,
                        isExistingUser: state.isExistingUser,
                        createAccount: state.userData.createAccount,
                    });

                    // 3. Crear orden
                    const order = await checkoutService.createOrder({
                        serviceId: state.service.id,
                        userId: paymentResult.userId,
                        paymentId: paymentResult.paymentId,
                        total: state.total,
                    });

                    set({
                        orderId: order.orderId,
                        step: 3,
                        isLoading: false,
                    });

                    // ============ INTEGRACIÓN CON STORES GLOBALES ============
                    console.log('🔄 Iniciando integración con stores...');
                    console.log('Estado actual:', { isExistingUser: state.isExistingUser, createAccount: state.userData.createAccount });

                    // 1. Si es usuario NUEVO, agregarlo a authStore y clientsStore
                    if (!state.isExistingUser && paymentResult.user) {
                        console.log('✅ Agregando usuario nuevo a authStore y clientsStore');
                        useAuthStore.getState().setUser(paymentResult.user);

                        // 2. Agregar nuevo cliente al clientsStore
                        useClientsStore.getState().addClient({
                            id: paymentResult.user.id,
                            nombre: state.userData.nombre,
                            email: state.userData.email,
                            telefono: state.userData.phone,
                            status: ClientStatus.ACTIVE,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                            serviciosContratados: 1,
                            totalGastado: state.total,
                        });
                        console.log('✅ Cliente agregado a clientsStore');
                    } else {
                        console.log('⚠️ Usuario existente o sin datos de usuario:', {
                            isExistingUser: state.isExistingUser,
                            hasUser: !!paymentResult.user
                        });
                    }

                    // 3. Agregar orden al ordersStore para dashboard admin
                    console.log('📦 Agregando orden a ordersStore...');
                    const orderForStore = {
                        id: parseInt(order.orderId.replace('ORD-', ''), 10),
                        userId: paymentResult.userId, // Ya es numérico
                        userName: state.userData.nombre,
                        userEmail: state.userData.email,
                        items: [{
                            id: 1,
                            serviceId: state.service.id,
                            serviceName: state.service.nombre || state.service.titulo || 'Servicio legal',
                            price: state.service.precio || 0,
                            quantity: 1,
                        }],
                        subtotal: state.total,
                        tax: 0,
                        total: state.total,
                        status: OrderStatus.PENDING,
                        paymentMethod: OrderPaymentMethod.CREDIT_CARD, // Mapear según state.paymentMethod
                        transactionId: paymentResult.paymentId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    useOrdersStore.getState().addOrder(orderForStore);
                    console.log('✅ Orden agregada a ordersStore:', orderForStore);

                    // 6. Enviar email de confirmación
                    await checkoutService.sendConfirmationEmail(order.orderId);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
                    set({
                        error: errorMessage,
                        isLoading: false,
                    });
                    throw error;
                }
            },

            reset: () => {
                set(initialState);
            },
        }),
        { name: 'checkout-store' }
    )
);
