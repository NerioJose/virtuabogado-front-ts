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
                const supabase = (await import('@/utils/supabase/client')).createClient();
                const { data: { session: freshSession } } = await supabase.auth.getSession();
                
                if (!currentUserId && state.userData) {
                    try {
                        const { user: rawUser } = await checkoutService.registerOrLogin(state.userData);
                        if (rawUser) {
                            const { authService } = await import('@/features/auth/services/auth.service');
                            const user = authService.mapSupabaseUserToEntity(rawUser);
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
                } else if (currentUserId && !freshSession) {
                    // El usuario cree estar logueado en el store, pero no hay sesión en Supabase (o expiró)
                    console.warn('🔄 Sesión no encontrada en Supabase, intentando recuperar...');
                    const { data: { user: recoveredUser } } = await supabase.auth.getUser();
                    if (!recoveredUser) {
                        set({ 
                            error: 'Tu sesión ha expirado. Por favor, vuelve a iniciar sesión.', 
                            isLoading: false 
                        });
                        // Opcional: Cerrar sesión en el store para forzar re-login
                        // useAuthStore.getState().logout();
                        return;
                    }
                }

                if (!currentUserId) {
                    set({ error: 'No se pudo identificar al usuario', isLoading: false });
                    return;
                }

                // 1.5. ACTUALIZAR PERFIL: Si el usuario ya existe pero no tiene nombre (o es 'Usuario')
                const currentUser = useAuthStore.getState().user;
                if (currentUser && state.userData?.nombre && (currentUser.nombre === 'Usuario' || !currentUser.nombre)) {
                    console.log('📝 Actualizando nombre de usuario en perfil:', state.userData.nombre);
                    const { error: updateError } = await supabase.auth.updateUser({
                        data: { nombre: state.userData.nombre }
                    });
                    
                    if (!updateError) {
                        useAuthStore.getState().updateUser({ nombre: state.userData.nombre });
                    }
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
                // Recargar usuario del store por si se actualizó en el paso 1.5
                const userAfterUpdate = useAuthStore.getState().user;

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
