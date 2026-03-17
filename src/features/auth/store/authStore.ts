'use client';

/**
 * Store global de autenticación - Zustand
 * Fuente única de verdad para el estado de auth en toda la app
 * Sincroniza con localStorage legacy para compatibilidad
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/shared/types/entities.types';
import { useCheckoutStore } from '@/features/checkout/store/checkoutStore';
import { useOrdersStore } from '@/features/orders/store/ordersStore';
// import { useClientsStore } from '@/features/clients/store/clientsStore';
// import { useLawyersStore } from '@/features/lawyers/store/lawyersStore';

interface AuthState {
    // Estado
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Acciones sync
    setUser: (user: User | null) => void;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    clearUser: () => void;

    // Acciones de estado
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;

    // Utilidades
    checkAuth: () => void;
    reset: () => void;
}

const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ============ Acciones Sync ============

            setUser: (user: User | null) => {
                set({
                    user,
                    isAuthenticated: !!user,
                    error: null,
                });

                // Disparar evento para componentes legacy si es necesario
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('authChange'));
                }
            },

            login: (user: User) => {
                const state = get() as any;
                state.setUser(user);
            },

            logout: () => {
                // 1. Limpiar estado instantáneamente para UI reactiva
                set({
                    user: null,
                    isAuthenticated: false,
                    error: null,
                });

                // 2. Limpiar persistencia local
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('virtuabogado_checkout');
                    localStorage.removeItem('virtuabogado-auth');
                    window.dispatchEvent(new Event('authChange'));
                }

                // 3. Limpiar stores
                useCheckoutStore.getState().reset();
                useOrdersStore.getState().reset();

                // 4. Limpiar React Query Cache (Previene 401s de polling/refetch)
                import('@/lib/queryClient').then(({ queryClient }) => {
                    queryClient.clear();
                });

                // 5. Llamada asíncrona a Supabase sin bloquear la UI
                import('../services/auth.service').then(({ authService }) => {
                    authService.logout().catch(console.error);
                });
            },

            updateUser: (userData: Partial<User>) => {
                const state = get() as any;
                const currentUser = state.user;
                if (!currentUser) return;

                const updatedUser = { ...currentUser, ...userData };
                state.setUser(updatedUser);
            },

            clearUser: () => {
                const state = get() as any;
                state.logout();
            },

            // ============ Estado ============

            setError: (error: string | null) => set({ error }),

            setLoading: (loading: boolean) => set({ isLoading: loading }),

            // ============ Utilidades ============

            checkAuth: async () => {
                try {
                    // Evitar ejecución en servidor si no es necesario, aunque authService maneja client
                    if (typeof window === 'undefined') return;

                    // Si ya hay un usuario en el store, verificar sesión
                    const state = get() as any;
                    const currentUser = state.user;
                    if (currentUser) {
                        console.log('✅ Usuario ya en store:', currentUser.email);
                        return;
                    }
                    // -------------------------------------------

                    // set({ isLoading: true }); // Opcional: manejar loading global
                    const { authService } = await import('../services/auth.service');
                    const user = await authService.getCurrentUser();

                    if (user) {
                        set({
                            user,
                            isAuthenticated: true,
                            isLoading: false,
                        });
                    } else {
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                        });
                    }
                } catch (error) {
                    console.error('Error checking auth:', error);
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false
                    });
                }
            },

            reset: () => {
                set(initialState);
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('user');
                }

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('authChange'));
                }
            },
        }),
        {
            name: 'virtuabogado-auth',
            storage: createJSONStorage(() => localStorage),
            partialize: (state: AuthState & { [key: string]: any }) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
            // Migrar datos antiguos de localStorage si existen
            onRehydrateStorage: () => (stateStr) => {
                const typedState = stateStr as AuthState;
                if (typeof window !== 'undefined' && typedState) {
                    // Sincronizar con localStorage legacy al hidratar
                    const oldUserData = localStorage.getItem('user');
                    if (oldUserData && !typedState.user) {
                        try {
                            const oldUser = JSON.parse(oldUserData);
                            typedState.setUser(oldUser);
                        } catch (error) {
                            console.error('Error migrating old user data:', error);
                        }
                    }
                }
            },
        }
    ) as unknown as import('zustand').StateCreator<AuthState>
);

// Hook de inicialización para usar al montar la app
export const initializeAuth = () => {
    const checkAuth = useAuthStore.getState().checkAuth;
    checkAuth();
};
