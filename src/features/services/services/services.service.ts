import { apiClient } from '@/lib/apiClient';
import { Service, CreateServiceRequest, UpdateServiceRequest } from '../types/services.types';

class ServicesService {
    private readonly BASE_URL = '/api/services';

    /**
     * Obtener todos los servicios activos (para clientes)
     */
    async getActive(): Promise<Service[]> {
        return await apiClient.get<Service[]>(this.BASE_URL);
    }

    /**
     * Obtener todos los servicios (para administradores)
     */
    async getAll(): Promise<Service[]> {
        return await apiClient.get<Service[]>(`${this.BASE_URL}?all=true`);
    }

    /**
     * Crear un nuevo servicio
     */
    async create(data: CreateServiceRequest): Promise<Service> {
        return await apiClient.post<Service>(this.BASE_URL, data);
    }

    /**
     * Actualizar un servicio existente
     */
    async update(id: number, data: Partial<UpdateServiceRequest>): Promise<Service> {
        return await apiClient.patch<Service>(`${this.BASE_URL}/${id}`, data);
    }

    /**
     * Desactivar un servicio (soft delete)
     */
    async deactivate(id: number): Promise<void> {
        await apiClient.delete(`${this.BASE_URL}/${id}`);
    }
}

export const servicesService = new ServicesService();
