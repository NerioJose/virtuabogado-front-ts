import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Client, ClientsState, ClientsFilters } from '../types/clients.types';
import { apiClient } from '@/lib/apiClient';

const initialState = {
    clients: [],
    isLoading: false,
    error: null,
    filters: {},
};

export const useClientsStore = create<ClientsState>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ============ Acciones ============

            addClient: (client: Client) => {
                set((state) => ({
                    clients: [client, ...state.clients],
                    error: null,
                }));
            },

            setClients: (clients: Client[]) => {
                set({ clients, isLoading: false, error: null });
            },

            fetchClients: async (filters?: ClientsFilters) => {
                set({ isLoading: true, error: null });
                try {
                    const clients = await apiClient.get<Client[]>('/api/clients');

                    set({
                        clients,
                        isLoading: false,
                        filters: filters || {},
                    });

                    
                } catch (error) {
                    console.error('❌ ClientsStore: Error fetching clients:', error);
                    // Don't break UI for demo/offline mode
                    set({
                        error: 'Error de conexión (Modo Offline)',
                        isLoading: false,
                    });
                }
            },

            updateClient: async (id: string, data: Partial<Client>) => {
                try {
                    
                    set({ isLoading: true, error: null });
                    const updatedClient = await apiClient.put<Client>(`/api/clients/${id}`, data);
                    

                    set((state) => ({
                        clients: state.clients.map((client) =>
                            client.id === id ? { ...client, ...updatedClient } : client
                        ),
                        isLoading: false,
                    }));
                    
                } catch (error) {
                    console.error('❌ ClientsStore: Error updating client:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Error al actualizar el cliente',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            deleteClient: async (id: string) => {
                try {
                    set({ isLoading: true, error: null });
                    await apiClient.delete(`/api/clients/${id}`);

                    set((state) => ({
                        clients: state.clients.filter((client) => client.id !== id),
                        isLoading: false,
                    }));
                    
                } catch (error) {
                    console.error('❌ ClientsStore: Error deleting client:', error);
                    set({
                        error: error instanceof Error ? error.message : 'Error al eliminar el cliente',
                        isLoading: false,
                    });
                    throw error;
                }
            },

            getClientById: (id: string) => {
                return get().clients.find((client) => client.id === id);
            },

            setFilters: (filters: ClientsFilters) => {
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
            name: 'virtuabogado-clients-v2',
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => {
                
                return (state, error) => {
                    if (error) {
                        console.error('❌ ClientsStore: Error en rehydration:', error);
                    } else {
                        
                    }
                };
            }
        }
    )
);

// Función para inicializar clientes desde la API
export const initializeClients = () => {
    const store = useClientsStore.getState();
    
    store.fetchClients();
};
