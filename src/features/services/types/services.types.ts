export interface Service {
    id: number;
    titulo: string;
    descripcion: string;
    precio: number;
    precioPen: number | null;
    imagenUrl: string | null;
    activo: boolean;
}

export interface CreateServiceRequest {
    titulo: string;
    descripcion: string;
    precio: number;
    precioPen?: number | null;
    imagenUrl?: string;
    activo?: boolean;
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
    id: number;
}
