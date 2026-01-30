import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { CheckoutState, CheckoutStep, UserCheckoutData, PaymentData, PaymentMethod } from '../types/checkout.types';
import type { Servicio } from '@/shared/types/entities.types';
import { checkoutService } from '../services/checkout.service';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrdersStore } from '@/features/orders/store/ordersStore';
import { queryClient } from '@/lib/queryClient';
import { CLIENT_KEYS } from '@/features/clients/hooks/useClients';
import { LAWYER_KEYS } from '@/features/lawyers/hooks/useLawyers';
// import { useClientsStore } from '@/features/clients';
import { Order, OrderStatus, PaymentMethod as OrderPaymentMethod } from '@/features/orders/types/orders.types';
import { ClientStatus } from '@/features/clients/types/clients.types';

const getInitialState = () => ({
    service: null as Servicio | null,
    userData: null as UserCheckoutData | null,
    paymentData: null as PaymentData | null,
    paymentMethod: 'card' as PaymentMethod,
    orderId: undefined as string | undefined,
    total: 0,
    step: 1 as CheckoutStep,
    isOpen: false,
    isLoading: false,
    error: null as string | null,
    isExistingUser: false,
    existingUserId: null as string | null,
    tempPassword: null as string | null,
    completedAt: null as string | null,
});

export const useCheckoutStore = create<CheckoutState>()(
    (set, get) => ({
        ...getInitialState(),

        openCheckout: (service: Servicio) => {
            const currentState = get();

            if (currentState.step === 3) {
                set(getInitialState());
                setTimeout(() => {
                    get().openCheckout(service);
                }, 50);
                return;
            }

            const authUser = useAuthStore.getState().user;
            const isUserAuthenticated = useAuthStore.getState().isAuthenticated;

            if (isUserAuthenticated && authUser) {
                const prefilledUserData = {
                    email: authUser.email,
                    name: authUser.nombre,
                    nombre: authUser.nombre,
                    phone: authUser.telefono || '',
                    createAccount: false,
                };

                set({
                    ...getInitialState(),
                    completedAt: null,
                    isOpen: true,
                    service,
                    total: service.precio || 0,
                    step: 2,
                    userData: prefilledUserData,
                    isExistingUser: true,
                });
            } else {
                set({
                    ...getInitialState(),
                    isOpen: true,
                    service,
                    total: service.precio || 0,
                    step: 1,
                    userData: null,
                    isExistingUser: false,
                    existingUserId: null,
                    completedAt: null,
                });
            }
        },

        closeCheckout: () => {
            const currentState = get();
            if (currentState.step === 3 || currentState.completedAt) {
                set(getInitialState());
            } else {
                set({ isOpen: false });
            }
        },

        setStep: (step: CheckoutStep) => {
            set({ step, error: null });
        },

        setUserData: (data: UserCheckoutData) => {
            const normalizedData = {
                ...data,
                nombre: data.nombre || data.name,
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
            // Deprecated in favor of implicit registration
            return false;
        },

        submitOrder: async () => {
            const state = get();

            if (!state.service || !state.userData || !state.paymentData) {
                set({ error: 'Datos incompletos. Por favor completa todos los campos.' });
                return;
            }

            set({ isLoading: true, error: null });

            try {
                let currentUserId = state.existingUserId || useAuthStore.getState().user?.id;

                // 1. AUTENTICACIÓN: Auto-login o auto-registro UNIFICADO
                if (!currentUserId && state.userData) {
                    try {
                        const { user } = await checkoutService.registerOrLogin(state.userData);
                        if (user) {
                            currentUserId = user.id;
                            useAuthStore.getState().setUser(user);
                        }
                    } catch (authError) {
                        console.error('Auth error:', authError);
                        set({
                            error: authError instanceof Error ? authError.message : 'Error al autenticar',
                            isLoading: false
                        });
                        return;
                    }
                }

                if (!currentUserId) {
                    set({ error: 'No se pudo identificar al usuario', isLoading: false });
                    return;
                }

                // 2. Procesar pago
                const paymentResult = await checkoutService.processPayment({
                    service: state.service,
                    paymentData: state.paymentData,
                    paymentMethod: state.paymentMethod,
                    email: state.userData.email,
                    nombre: state.userData.nombre,
                    isExistingUser: !!state.existingUserId,
                    createAccount: state.userData.createAccount,
                    userId: currentUserId
                });

                // 3. Crear orden
                const order = await checkoutService.createOrder({
                    serviceId: state.service.id,
                    userId: currentUserId,
                    paymentId: paymentResult.paymentId,
                    total: state.total,
                });

                set({
                    orderId: order.orderId,
                    step: 3,
                    isLoading: false,
                });

                // Integración Stores
                const currentUser = useAuthStore.getState().user;

                // Invalidate React Query caches to ensure UI updates immediately
                // This ensures "100% reactivity" for the current user without page refresh
                await queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all });
                await queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all });
                // We don't have ORDER_KEYS constant yet, but we can invalidate by key string
                // await queryClient.invalidateQueries({ queryKey: ['orders'] }); 
                // Orders are mostly legacy store for now, but good practice to invalidate if migrated

                const orderForStore: Order = {
                    id: order.orderId,
                    userId: paymentResult.userId,
                    userName: state.userData.nombre,
                    userEmail: state.userData.email,
                    items: [{
                        id: '1',
                        serviceId: state.service.id,
                        serviceName: state.service.nombre || state.service.titulo || 'Servicio legal',
                        price: Number(state.service.precio) || 0,
                        quantity: 1,
                    }],
                    subtotal: state.total,
                    tax: 0,
                    total: state.total,
                    status: OrderStatus.PENDING,
                    paymentMethod: OrderPaymentMethod.CREDIT_CARD,
                    transactionId: paymentResult.paymentId,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                useOrdersStore.getState().addOrder(orderForStore);

                await checkoutService.sendConfirmationEmail(order.orderId);
                set({ completedAt: new Date().toISOString() });

            } catch (error) {
                set({
                    error: error instanceof Error ? error.message : 'Error al procesar el pago',
                    isLoading: false,
                });
            }
        },

        markAsCompleted: () => {
            set({ completedAt: new Date().toISOString() });
        },

        reset: () => {
            set(getInitialState());
        },
    })
);
