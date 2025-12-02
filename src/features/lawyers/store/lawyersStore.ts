/**
 * Store global de abogados - Zustand
 * Gestiona todos los abogados de la aplicación
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Lawyer, LawyersState, LawyersFilters } from '../types/lawyers.types';

const initialState = {
    lawyers: [],
    isLoading: false,
    error: null,
    filters: {},
};

export const useLawyersStore = create<LawyersState>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ============ Acciones ============

            addLawyer: (lawyer: Lawyer) => {
                set((state) => ({
                    lawyers: [lawyer, ...state.lawyers],
                    error: null,
                }));
            },

            fetchLawyers: async (filters?: LawyersFilters) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Implementar llamada real a la API
                    console.log('Fetching lawyers with filters:', filters);

                    // Mock: Cargar abogados del localStorage por ahora
                    const storedLawyers = localStorage.getItem('lawyers');
                    const lawyers = storedLawyers ? JSON.parse(storedLawyers) : [];

                    set({
                        lawyers,
                        isLoading: false,
                        filters: filters || {},
                    });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Error al cargar abogados',
                        isLoading: false,
                    });
                }
            },

            updateLawyer: (id: number, data: Partial<Lawyer>) => {
                set((state) => ({
                    lawyers: state.lawyers.map((lawyer) =>
                        lawyer.id === id
                            ? { ...lawyer, ...data, updatedAt: new Date() }
                            : lawyer
                    ),
                }));
            },

            deleteLawyer: (id: number) => {
                set((state) => ({
                    lawyers: state.lawyers.filter((lawyer) => lawyer.id !== id),
                }));
            },

            getLawyerById: (id: number) => {
                return get().lawyers.find((lawyer) => lawyer.id === id);
            },

            setFilters: (filters: LawyersFilters) => {
                set({ filters });
            },

            clearFilters: () => {
                set({ filters: {} });
            },

            reset: () => {
                set(initialState);
            },
        }),
        {
            name: 'virtuabogado-lawyers-v2', // v2 para limpiar datos mock del localStorage
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                lawyers: state.lawyers,
            }),
        }
    )
);

// Función para inicializar abogados - SIN mock data
export const initializeLawyers = () => {
    const store = useLawyersStore.getState();

    // Solo cargar desde localStorage si existe
    // Los abogados se agregan manualmente por el admin
    console.log('LawyersStore initialized:', store.lawyers.length, 'lawyers');
};
