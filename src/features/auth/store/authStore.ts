'use client';

/**
 * Store de autenticación usando Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/shared/types/entities.types';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    login: (user: User) => void;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,

            setUser: (user) =>
                set({
                    user,
                    isAuthenticated: !!user,
                }),

            login: (user) =>
                set({
                    user,
                    isAuthenticated: true,
                }),

            logout: () =>
                set({
                    user: null,
                    isAuthenticated: false,
                }),

            updateUser: (userData) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null,
                })),
        }),
        {
            name: 'auth-storage',
            // Migrar datos antiguos de localStorage si existen
            onRehydrateStorage: () => (state) => {
                // Intentar migrar datos del formato antiguo al nuevo
                if (typeof window !== 'undefined' && !state?.user) {
                    const oldUserData = localStorage.getItem('user');
                    if (oldUserData) {
                        try {
                            const oldUser = JSON.parse(oldUserData);
                            // Convertir del formato antiguo al nuevo
                            state?.setUser({
                                id: oldUser.id || 1,
                                email: oldUser.email || '',
                                nombre: oldUser.name || oldUser.nombre || '',
                                rol: oldUser.rol,
                                picture: oldUser.picture,
                            });
                            // Limpiar dato antiguo
                            localStorage.removeItem('user');
                        } catch (error) {
                            console.error('Error migrating old user data:', error);
                        }
                    }
                }
            },
        }
    )
);
