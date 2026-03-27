/**
 * Entidades principales del dominio
 * Centralización de tipos Frontend-Safe para evitar fugas de Prisma.
 */

export enum UserRole {
    ADMIN = 'ADMIN',
    ABOGADO = 'ABOGADO',
    CLIENTE = 'CLIENTE'
}

export enum OrderStatus {
    PAGO_PENDIENTE = 'PAGO_PENDIENTE',
    PAGO_RECHAZADO = 'PAGO_RECHAZADO',
    PENDIENTE = 'PENDIENTE',
    EN_PROGRESO = 'EN_PROGRESO',
    REVISION = 'REVISION',
    COMPLETADO = 'COMPLETADO',
    CANCELADO = 'CANCELADO',
    FALLIDO = 'FALLIDO'
}

export interface Servicio {
    id: number;
    nombre?: string; // For checkout compat
    titulo?: string; // For services page
    descripcion: string;
    precio?: number;
    duracion?: string;
    imagen?: string;
    icono?: any;
}

export interface User {
    id: string; // UUID de DB
    email: string;
    nombre: string;
    rol: UserRole;
    telefono?: string;
    direccion?: string;
    dni?: string;
    especialidad?: string;
    matricula?: string;
    experiencia?: number;
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
