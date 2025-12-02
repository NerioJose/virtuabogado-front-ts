/**
 * Tipos para el feature de clientes
 */

export enum ClientStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
}

export interface Client {
    id: number;
    nombre: string;
    email: string;
    telefono?: string;
    direccion?: string;
    status: ClientStatus;
    createdAt: Date;
    updatedAt: Date;
    serviciosContratados: number;
    totalGastado: number;
}

export interface CreateClientRequest {
    nombre: string;
    email: string;
    telefono?: string;
    direccion?: string;
}

export interface UpdateClientRequest {
    id: number;
    nombre?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    status?: ClientStatus;
}

export interface ClientsFilters {
    status?: ClientStatus;
    searchQuery?: string;
    startDate?: Date;
    endDate?: Date;
}

export interface ClientsState {
    clients: Client[];
    isLoading: boolean;
    error: string | null;
    filters: ClientsFilters;

    // Actions
    addClient: (client: Client) => void;
    fetchClients: (filters?: ClientsFilters) => Promise<void>;
    updateClient: (id: number, data: Partial<Client>) => void;
    deleteClient: (id: number) => void;
    getClientById: (id: number) => Client | undefined;
    setFilters: (filters: ClientsFilters) => void;
    clearFilters: () => void;
    reset: () => void;
}
