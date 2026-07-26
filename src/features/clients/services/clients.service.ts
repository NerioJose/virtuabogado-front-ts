import { apiClient } from '@/lib/apiClient';
import { Client, ClientStatus, ClientsFilters, PaginatedResponse } from '../types/clients.types';

export const clientsService = {
    getAll: async (filters?: ClientsFilters): Promise<Client[]> => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.searchQuery) params.append('search', filters.searchQuery);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        const url = queryString ? `/api/clients?${queryString}` : '/api/clients';
        const response = await apiClient.get<Client[] | PaginatedResponse<Client>>(url);

        if (Array.isArray(response)) {
            return response;
        }
        return response.data;
    },

    getAllPaginated: async (filters?: ClientsFilters): Promise<PaginatedResponse<Client>> => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.searchQuery) params.append('search', filters.searchQuery);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        const url = queryString ? `/api/clients?${queryString}` : '/api/clients';
        return apiClient.get<PaginatedResponse<Client>>(url);
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
