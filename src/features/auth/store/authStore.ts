'use client';

/**
 * Store global de autenticación - Zustand
 * Fuente única de verdad para el estado de auth en toda la app
 * Sincroniza con localStorage legacy para compatibilidad
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/shared/types/entities.types';

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

                // Sincronizar con localStorage legacy
                if (user) {
                    localStorage.setItem('user', JSON.stringify(user));
                } else {
                    localStorage.removeItem('user');
                }

                // Disparar evento para componentes legacy
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('authChange'));
                }
            },

            login: (user: User) => {
                get().setUser(user);
            },

            logout: () => {
                set({
                    user: null,
                    isAuthenticated: false,
                    error: null,
                });

                localStorage.removeItem('user');

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('authChange'));
                }
            },

            updateUser: (userData: Partial<User>) => {
                const currentUser = get().user;
                if (!currentUser) return;

                const updatedUser = { ...currentUser, ...userData };
                get().setUser(updatedUser);
            },

            clearUser: () => {
                get().logout();
            },

            // ============ Estado ============

            setError: (error: string | null) => set({ error }),

            setLoading: (loading: boolean) => set({ isLoading: loading }),

            // ============ Utilidades ============

            checkAuth: () => {
                try {
                    const userData = localStorage.getItem('user');
                    if (userData) {
                        const user: User = JSON.parse(userData);
                        set({
                            user,
                            isAuthenticated: true,
                        });
                    } else {
                        set({
                            user: null,
                            isAuthenticated: false,
                        });
                    }
                } catch (error) {
                    console.error('Error checking auth:', error);
                    get().clearUser();
                }
            },

            reset: () => {
                set(initialState);
                localStorage.removeItem('user');

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('authChange'));
                }
            },
        }),
        {
            name: 'virtuabogado-auth',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                isAuthenticated: state.isAuthenticated,
            }),
            // Migrar datos antiguos de localStorage si existen
            onRehydrateStorage: () => (state) => {
                if (typeof window !== 'undefined' && state) {
                    // Sincronizar con localStorage legacy al hidratar
                    const oldUserData = localStorage.getItem('user');
                    if (oldUserData && !state.user) {
                        try {
                            const oldUser = JSON.parse(oldUserData);
                            state.setUser(oldUser);
                        } catch (error) {
                            console.error('Error migrating old user data:', error);
                        }
                    }
                }
            },
        }
    )
);

// Hook de inicialización para usar al montar la app
export const initializeAuth = () => {
    const checkAuth = useAuthStore.getState().checkAuth;
    checkAuth();
};
