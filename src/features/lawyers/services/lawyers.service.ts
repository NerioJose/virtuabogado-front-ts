import { apiClient } from '@/lib/apiClient';
import { Lawyer, LawyersFilters, LawyerStatus } from '../types/lawyers.types';

export const lawyersService = {
    getAll: async (filters?: LawyersFilters): Promise<Lawyer[]> => {
        const params = new URLSearchParams();
        if (filters?.especialidad) params.append('especialidad', filters.especialidad);
        if (filters?.status) params.append('status', filters.status);
        if (filters?.searchQuery) params.append('search', filters.searchQuery);

        const response = await apiClient.get<Lawyer[]>('/api/lawyers');

        let lawyers = response;

        // Client-side filtering fallback
        if (filters?.especialidad && filters.especialidad !== 'todas' as any) {
            lawyers = lawyers.filter(l => l.especialidad === filters.especialidad);
        }
        if (filters?.status && filters.status !== 'ALL' as any) { // 'ALL' isn't in enum but used in UI
            lawyers = lawyers.filter(l => l.status === filters.status);
        }
        if (filters?.searchQuery) {
            const lowerQuery = filters.searchQuery.toLowerCase();
            lawyers = lawyers.filter(l =>
                l.nombre.toLowerCase().includes(lowerQuery) ||
                l.email.toLowerCase().includes(lowerQuery)
            );
        }

        return lawyers;
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
