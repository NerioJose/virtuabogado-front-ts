import { apiClient } from '@/lib/apiClient';
import { Lawyer, LawyersFilters, LawyerStatus, PaginatedResponse } from '../types/lawyers.types';

export const lawyersService = {
    getAll: async (filters?: LawyersFilters): Promise<Lawyer[]> => {
        const params = new URLSearchParams();
        if (filters?.especialidad) params.append('especialidad', filters.especialidad);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.searchQuery) params.append('search', filters.searchQuery);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        const url = queryString ? `/api/lawyers?${queryString}` : '/api/lawyers';
        const response = await apiClient.get<Lawyer[] | PaginatedResponse<Lawyer>>(url);

        if (Array.isArray(response)) {
            return response;
        }
        return response.data;
    },

    getAllPaginated: async (filters?: LawyersFilters): Promise<PaginatedResponse<Lawyer>> => {
        const params = new URLSearchParams();
        if (filters?.especialidad) params.append('especialidad', filters.especialidad);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.searchQuery) params.append('search', filters.searchQuery);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        const url = queryString ? `/api/lawyers?${queryString}` : '/api/lawyers';
        return apiClient.get<PaginatedResponse<Lawyer>>(url);
    },

    getById: async (id: string): Promise<Lawyer> => {
        return apiClient.get<Lawyer>(`/api/lawyers/${id}`);
    },

    create: async (data: Omit<Lawyer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lawyer> => {
        return apiClient.post<Lawyer>('/api/lawyers', data);
    },

    update: async (id: string, data: Partial<Lawyer>): Promise<Lawyer> => {
        return apiClient.put<Lawyer>(`/api/lawyers/${id}`, data);
    },

    delete: async (id: string): Promise<void> => {
        return apiClient.delete(`/api/lawyers/${id}`);
    }
};
