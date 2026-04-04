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
import { Order, OrderStatus, PaymentMethod as OrderPaymentMethod, ORDER_KEYS } from '@/features/orders';
import { processPaymentAction } from '../actions/processPaymentAction';
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
    isProcessingPayment: false,
    isWaitingForWebhook: false,
});

export const useCheckoutStore = create<CheckoutState>()(
    (set, get) => ({
        ...getInitialState(),

        openCheckout: (service: Servicio) => {
            const currentState = get();

            // Si el checkout previo se completó (Paso 3), resetear antes de abrir uno nuevo
            if (currentState.step === 3 || currentState.completedAt) {
                console.log('🔄 Resetting checkout state for a new purchase...');
                set(getInitialState());
                // Pequeño delay para asegurar que el estado se limpie antes de re-abrir
                setTimeout(() => {
                    get().openCheckout(service);
                }, 10);
                return;
            }

            // Obtener estado de autenticación actual
            const authStore = useAuthStore.getState();
            const authUser = authStore.user;
            const isUserAuthenticated = authStore.isAuthenticated;

            console.log('🛒 OpenCheckout:', { 
                service: service.titulo, 
                isUserAuthenticated, 
                hasUser: !!authUser 
            });

            // Si el usuario está autenticado, saltar directamente al paso 2 (Pago)
            if (isUserAuthenticated && authUser) {
                console.log('⏭️ Skipping to Step 2 for authenticated user:', authUser.email);
                
                const prefilledUserData = {
                    email: authUser.email,
                    name: authUser.nombre || '',
                    nombre: authUser.nombre || '',
                    phone: authUser.telefono || '',
                    createAccount: false,
                };

                set({
                    ...getInitialState(),
                    isOpen: true,
                    service,
                    total: Number(service.precio) || 0,
                    step: 2, // PAGO
                    userData: prefilledUserData,
                    isExistingUser: true,
                    completedAt: null,
                });
            } else {
                console.log('👤 Starting at Step 1 for guest/unauthenticated user');
                set({
                    ...getInitialState(),
                    isOpen: true,
                    service,
                    total: Number(service.precio) || 0,
                    step: 1, // IDENTIDAD
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
        
        setIsProcessingPayment: (isProcessingPayment: boolean) => {
            set({ isProcessingPayment });
        },

        setIsWaitingForWebhook: (isWaitingForWebhook: boolean) => {
            set({ isWaitingForWebhook });
        },

        setOrderId: (orderId: string) => {
            set({ orderId });
        },

        checkUserExists: async (email: string) => {
            const { checkUserExistsAction } = await import('../actions/checkUserAction');
            const result = await checkUserExistsAction(email);
            set({ isExistingUser: result.exists });
            return result.exists;
        },

        sendOtp: async (email: string) => {
            set({ isLoading: true, error: null });
            const state = get();
            try {
                await checkoutService.sendOtp(email, {
                    service: state.service,
                    email,
                });
                set({ isLoading: false });
            } catch (error) {
                set({ 
                    error: error instanceof Error ? error.message : 'Error al enviar el enlace',
                    isLoading: false 
                });
                throw error;
            }
        },

        verifyOtp: async (email: string, token: string) => {
            set({ isLoading: true, error: null });
            try {
                const user = await checkoutService.verifyOtp(email, token);
                if (user) {
                    const { authService } = await import('@/features/auth/services/auth.service');
                    const mappedUser = authService.mapSupabaseUserToEntity(user);
                    useAuthStore.getState().setUser(mappedUser);
                    set({ 
                        existingUserId: user.id,
                        isExistingUser: true,
                        isLoading: false,
                        step: 2 // Avanzar automáticamente tras verificar
                    });
                }
            } catch (error) {
                set({ 
                    error: error instanceof Error ? error.message : 'Código inválido o expirado',
                    isLoading: false 
                });
                throw error;
            }
        },

        /**
         * Autentica al usuario (login o registro) en el Paso 1
         */
        authenticateUser: async (userData: UserCheckoutData) => {
            set({ isLoading: true, error: null });
            try {
                console.log('🔐 [Checkout] Autenticando usuario en Paso 1:', userData.email);
                
                // PREVENCIÓN DE COLISIÓN DE SESIONES MULTI-PESTAÑA
                const supabase = (await import('@/utils/supabase/client')).createClient();
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session && session.user.email !== userData.email) {
                    console.warn(`⚠️ Mismatch de sesión detectado: Taba actual logged in como ${session.user.email}, intentando proceder como ${userData.email}`);
                    await supabase.auth.signOut();
                    useAuthStore.getState().clearUser();
                }

                const { user: rawUser, isNewUser } = await checkoutService.registerOrLogin(userData);
                
                if (rawUser) {
                    const { authService } = await import('@/features/auth/services/auth.service');
                    const user = authService.mapSupabaseUserToEntity(rawUser);
                    
                    // Actualizar store de autenticación global
                    useAuthStore.getState().setUser(user);
                    
                    set({ 
                        userData,
                        existingUserId: user.id,
                        isExistingUser: !isNewUser,
                        isLoading: false,
                        step: 2 // Avanzar al pago
                    });
                    
                    console.log('✅ [Checkout] Autenticación exitosa. Usuario:', user.email);
                    return true;
                }
                return false;
            } catch (error: any) {
                console.error('❌ [Checkout] Error de autenticación:', error);
                set({ 
                    error: error.message || 'Error al validar identidad',
                    isLoading: false 
                });
                return false;
            }
        },

        submitOrder: async () => {
            const state = get();

            if (!state.service || !state.userData || !state.paymentData) {
                set({ error: 'Datos incompletos. Por favor completa todos los campos.' });
                return;
            }

            set({ isLoading: true, error: null });

            try {
                // 1. AUTENTICACIÓN: Usar usuario ya logueado del store o intentar login/registro
                const currentAuthUser = useAuthStore.getState().user;
                let currentUserId = currentAuthUser?.id || state.existingUserId;

                const supabase = (await import('@/utils/supabase/client')).createClient();
                const { data: { session: freshSession } } = await supabase.auth.getSession();
                
                // Si NO hay usuario logueado o sesión, intentamos el login final (Fallback)
                if (!currentUserId && state.userData) {
                    console.log('🔄 [Checkout] Usuario no detectado al final, intentando registerOrLogin de último minuto...');
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
                } else if (!freshSession && !currentUserId) {
                    set({ 
                        error: 'Su sesión ha expirado o no es válida. Por favor, valide su identidad en el Paso 1.', 
                        isLoading: false 
                    });
                    return;
                }

                if (!currentUserId) {
                    set({ error: 'No se pudo identificar al usuario. Por favor reinicie el proceso.', isLoading: false });
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

                // 2. Procesar pago y crear orden en un solo paso atómico (Server Action)
                console.log('🚀 [Checkout Store] Iniciando transacción en el servidor...');
                const result = await processPaymentAction({
                    serviceId: state.service.id,
                    paymentMethodId: state.paymentMethod === 'card' ? 'mock' : state.paymentMethod // Ajuste temporal según IDENTIFIER
                });

                if (!result.success) {
                    throw new Error(result.message || 'Error al procesar el pago');
                }

                const order = result.order;
                
                // Si es Zenobank, redirigir a la pasarela
                if (result.redirectUrl) {
                    console.log('🔗 [Checkout Store] Redirigiendo a pasarela:', result.redirectUrl);
                    window.location.href = result.redirectUrl;
                    return;
                }

                set({
                    orderId: order.id,
                    step: 3,
                    isLoading: false,
                });

                // 4. PREPARAR OBJETO PARA CACHÉ (Optimistic Update)
                const orderForStore: Order = {
                    id: order.id, // UUID
                    numericId: Number(order.numericId) || 0,
                    userId: currentUserId,
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
                    status: OrderStatus.PENDIENTE,
                    paymentMethod: state.paymentMethod === 'card' ? OrderPaymentMethod.CREDIT_CARD : OrderPaymentMethod.CRYPTO,
                    transactionId: order.paymentId || '',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                // Optimistic UI update in React Query
                const userId = currentUserId;
                const orderKey = ORDER_KEYS.list({ userId });
                
                // 1. Update the list cache for this specific user
                queryClient.setQueryData(orderKey, (old: any) => {
                    const currentData = old?.data || [];
                    // Avoid duplicates
                    if (currentData.some((o: any) => o.id === orderForStore.id)) {
                        return old;
                    }
                    return {
                        ...old,
                        data: [orderForStore, ...currentData]
                    };
                });

                // 2. Update the general lists (used by admin/others if active)
                queryClient.setQueryData(ORDER_KEYS.list({}), (old: any) => {
                    const currentData = old?.data || [];
                    if (currentData.some((o: any) => o.id === orderForStore.id)) {
                        return old;
                    }
                    return {
                        ...old,
                        data: [orderForStore, ...currentData]
                    };
                });

                // 3. Set the detail cache for the destination page
                queryClient.setQueryData(ORDER_KEYS.detail(orderForStore.id), orderForStore);

                // 4. Also trigger invalidation as a background fallback (de-prioritized)
                queryClient.invalidateQueries({ queryKey: ORDER_KEYS.all, refetchType: 'none' });
                queryClient.invalidateQueries({ queryKey: CLIENT_KEYS.all, refetchType: 'none' });
                queryClient.invalidateQueries({ queryKey: LAWYER_KEYS.all, refetchType: 'none' });

                // Legacy store fallback
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
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem('virtuabogado_checkout');
                window.localStorage.removeItem('activeOrderId');
                window.localStorage.removeItem('virtuabogado_pending_order');
            }
            set(getInitialState());
        },
    })
);
