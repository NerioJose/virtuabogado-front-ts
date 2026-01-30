import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Lawyer, LawyersState, LawyersFilters } from '../types/lawyers.types';
import { apiClient } from '@/lib/apiClient';

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

            setLawyers: (lawyers: Lawyer[]) => {
                set({ lawyers, isLoading: false, error: null });
            },

            fetchLawyers: async (filters?: LawyersFilters) => {
                set({ isLoading: true, error: null });
                try {
                    const lawyers = await apiClient.get<Lawyer[]>('/api/lawyers');

                    set({
                        lawyers,
                        isLoading: false,
                        filters: filters || {},
                    });

                    console.log('✅ LawyersStore: Lawyers fetched from API:', lawyers.length);
                } catch (error) {
                    console.error('❌ LawyersStore: Error fetching lawyers:', error);
                    set({
                        error: 'Error de conexión (Modo Offline)',
                        isLoading: false,
                    });
                }
            },

            updateLawyer: async (id: string, data: Partial<Lawyer>) => {
                try {
                    set({ isLoading: true, error: null });
                    const updatedLawyer = await apiClient.put<Lawyer>(`/api/lawyers/${id}`, data);

                    set((state) => ({
                        lawyers: state.lawyers.map((lawyer) =>
                            lawyer.id === id ? { ...lawyer, ...updatedLawyer } : lawyer
                        ),
                        isLoading: false,
                    }));
                    console.log('✅ LawyersStore: Lawyer updated in API:', id);
                } catch (error) {
                    console.error('❌ LawyersStore: Error updating lawyer:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Error al actualizar el abogado',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            deleteLawyer: async (id: string) => {
                try {
                    set({ isLoading: true, error: null });
                    await apiClient.delete(`/api/lawyers/${id}`);

                    set((state) => ({
                        lawyers: state.lawyers.filter((lawyer) => lawyer.id !== id),
                        isLoading: false,
                    }));
                    console.log('✅ LawyersStore: Lawyer deleted in API (logic delete):', id);
                } catch (error) {
                    console.error('❌ LawyersStore: Error deleting lawyer:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Error al eliminar el abogado',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            getLawyerById: (id: string) => {
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
            name: 'virtuabogado-lawyers-v2',
            storage: createJSONStorage(() => localStorage),
        }
    )
);

// Función para inicializar abogados desde la API
export const initializeLawyers = () => {
    const store = useLawyersStore.getState();
    console.log('🔄 LawyersStore: Inicializando datos desde la API...');
    store.fetchLawyers();
};
