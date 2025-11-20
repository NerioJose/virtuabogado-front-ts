/**
 * Entidades principales del dominio
 */

export enum UserRole {
    ADMIN = 'admin',
    ABOGADO = 'abogado',
    CLIENTE = 'cliente',
}

export interface User {
    id: number;
    email: string;
    nombre: string;
    rol: UserRole;
    telefono?: string;
    picture?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Abogado extends User {
    rol: UserRole.ABOGADO;
    especialidad: string;
    numeroColegiado: string;
    experienciaAnios: number;
    valoracionMedia?: number;
    descripcion?: string;
    tarifaPorHora?: number;
}

export interface Cliente extends User {
    rol: UserRole.CLIENTE;
    empresa?: string;
    direccion?: string;
}

export interface Admin extends User {
    rol: UserRole.ADMIN;
    permisos?: string[];
}
