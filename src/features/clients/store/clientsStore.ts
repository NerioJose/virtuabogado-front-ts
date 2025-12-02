/**
 * Store global de clientes - Zustand
 * Gestiona todos los clientes de la aplicación
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Client, ClientsState, ClientsFilters } from '../types/clients.types';

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

            fetchClients: async (filters?: ClientsFilters) => {
                set({ isLoading: true, error: null });
                try {
                    // TODO: Implementar llamada real a la API
                    console.log('Fetching clients with filters:', filters);

                    // Mock: Cargar clientes del localStorage por ahora
                    const storedClients = localStorage.getItem('clients');
                    const clients = storedClients ? JSON.parse(storedClients) : [];

                    set({
                        clients,
                        isLoading: false,
                        filters: filters || {},
                    });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Error al cargar clientes',
                        isLoading: false,
                    });
                }
            },

            updateClient: (id: number, data: Partial<Client>) => {
                set((state) => ({
                    clients: state.clients.map((client) =>
                        client.id === id
                            ? { ...client, ...data, updatedAt: new Date() }
                            : client
                    ),
                }));
            },

            deleteClient: (id: number) => {
                set((state) => ({
                    clients: state.clients.filter((client) => client.id !== id),
                }));
            },

            getClientById: (id: number) => {
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
            name: 'virtuabogado-clients-v2', // v2 para limpiar datos mock del localStorage
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => {
                console.log('🔄 ClientsStore: Iniciando rehydration desde localStorage');
                return (state, error) => {
                    if (error) {
                        console.error('❌ ClientsStore: Error en rehydration:', error);
                    } else {
                        console.log('✅ ClientsStore: Rehydration completada. Clients:', state?.clients.length || 0);
                    }
                };
            },
            // Removido partialize - causaba problemas de persistencia
        }
    )
);

// ============ CROSS-TAB SYNCHRONIZATION ============
// Escuchar cambios en localStorage desde otras pestañas
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'virtuabogado-clients-v2' && e.newValue) {
            try {
                const data = JSON.parse(e.newValue);
                if (data.state && data.state.clients) {
                    console.log('🔄 ClientsStore: Sincronizando desde otra pestaña. Clients:', data.state.clients.length);
                    useClientsStore.setState({ clients: data.state.clients });
                }
            } catch (error) {
                console.error('Error sincronizando clientsStore:', error);
            }
        }
    });
}

// Función para inicializar clientes - SIN mock data
export const initializeClients = () => {
    const store = useClientsStore.getState();

    // IMPORTANTE: Si ves datos mock, limpia el localStorage del navegador
    // Presiona F12 -> Application -> Local Storage -> localhost:3000 -> Clear All
    console.log('ClientsStore initialized:', store.clients.length, 'clients');
};
