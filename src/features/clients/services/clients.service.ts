import { apiClient } from '@/lib/apiClient';
import { Client, ClientStatus, ClientsFilters } from '../types/clients.types';

export const clientsService = {
    getAll: async (filters?: ClientsFilters): Promise<Client[]> => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.searchQuery) params.append('search', filters.searchQuery);

        // TODO: Update API to support query params if not already supported
        const response = await apiClient.get<Client[]>('/api/clients');

        // Client-side filtering fallback until API supports it (to match previous behavior)
        let clients = response;
        if (filters?.status && filters.status !== 'ALL') { // Assuming 'ALL' isn't a valid ClientStatus but used in UI
            clients = clients.filter(c => c.status === filters.status);
        }
        if (filters?.searchQuery) {
            const lowerQuery = filters.searchQuery.toLowerCase();
            clients = clients.filter(c =>
                c.nombre.toLowerCase().includes(lowerQuery) ||
                c.email.toLowerCase().includes(lowerQuery)
            );
        }

        return clients;
    },

    getById: async (id: string): Promise<Client> => {
        return apiClient.get<Client>(`/api/clients/${id}`);
    },

    create: async (data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> => {
        return apiClient.post<Client>('/api/clients', data);
    },

    update: async (id: string, data: Partial<Client>): Promise<Client> => {
        return apiClient.put<Client>(`/api/clients/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
        return apiClient.delete(`/api/clients/${id}`);
    }
};
