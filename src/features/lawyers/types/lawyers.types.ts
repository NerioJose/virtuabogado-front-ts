/**
 * Tipos para el feature de abogados
 */

export enum LawyerStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
}

export enum LawyerSpecialty {
    CIVIL = 'civil',
    PENAL = 'penal',
    LABORAL = 'laboral',
    MERCANTIL = 'mercantil',
    FAMILIAR = 'familiar',
    TRIBUTARIO = 'tributario',
}

export interface Lawyer {
    id: number;
    nombre: string;
    email: string;
    telefono?: string;
    especialidad: LawyerSpecialty;
    status: LawyerStatus;
    matricula?: string;
    experiencia?: number; // años
    casosActivos: number;
    casosCompletados: number;
    rating?: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateLawyerRequest {
    nombre: string;
    email: string;
    telefono?: string;
    especialidad: LawyerSpecialty;
    matricula?: string;
    experiencia?: number;
}

export interface UpdateLawyerRequest {
    id: number;
    nombre?: string;
    email?: string;
    telefono?: string;
    especialidad?: LawyerSpecialty;
    status?: LawyerStatus;
    matricula?: string;
    experiencia?: number;
}

export interface LawyersFilters {
    status?: LawyerStatus;
    especialidad?: LawyerSpecialty;
    searchQuery?: string;
}

export interface LawyersState {
    lawyers: Lawyer[];
    isLoading: boolean;
    error: string | null;
    filters: LawyersFilters;

    // Actions
    addLawyer: (lawyer: Lawyer) => void;
    fetchLawyers: (filters?: LawyersFilters) => Promise<void>;
    updateLawyer: (id: number, data: Partial<Lawyer>) => void;
    deleteLawyer: (id: number) => void;
    getLawyerById: (id: number) => Lawyer | undefined;
    setFilters: (filters: LawyersFilters) => void;
    clearFilters: () => void;
    reset: () => void;
}
