// Interfaz para los datos del abogado (ya existe, mantener)
export interface Abogado {
	id: string;
	nombre: string;
	email: string;
	role?: 'abogado';
	telefono: string;
	picture?: string;
	especialidad: string;
	numeroColegiado: string;
	experienciaAnios: number;
	valoracionMedia: number;
}

// Interfaz para las estadísticas del abogado (ya existe, mantener)
export interface Estadisticas {
	casosActivos: number;
	casosPendientes: number;
	proximaCita: string;
	clientesActivos: number;
	ingresosMes: number;
	casosCompletados: number;
}

// Nuevo tipo para el retorno del hook useAbogadoData
export interface UseAbogadoDataReturn {
	abogado: Abogado | null;
	estadisticas: Estadisticas;
	loading: boolean;
}

// Tipos para las secciones del panel de abogado
export type SeccionAbogado =
	| 'casos'
	| 'agenda'
	| 'mensajes'
	| 'clientes'
	| 'facturacion'
	| 'documentos'
	| 'perfil'
	| 'historial';

// Tipos para configuración de seguridad
export interface ConfiguracionSeguridad {
	copiasAutomaticas: boolean;
	frecuenciaCopia: 'diaria' | 'semanal' | 'mensual';
	retencionDias: number;
}

// Tipos para configuración general del admin
export interface ConfiguracionGeneral {
	nombrePlataforma: string;
	emailContacto: string;
	telefonoSoporte: string;
	idiomaPredeterminado: string;
	zonaHoraria: string;
}

// Tipos para configuración de notificaciones
export interface ConfiguracionNotificaciones {
	notificacionesCasos: boolean;
	notificacionesPagos: boolean;
	notificacionesClientes: boolean;
	notificacionesAbogados: boolean;
	notificacionesEmail: boolean;
	notificacionesSMS: boolean;
}

// Tipos para configuración de pagos
export interface ConfiguracionPagos {
	comisionPlataforma: number;
	diaspagoAbogados: number;
	metodoPagoPrincipal: string;
	ivaAplicado: number;
}
// Interfaz para Usuario Admin
export interface AdminUser {
	id: string;
	name: string;
	email: string;
	role: 'admin';
	picture?: string;
}
// Interfaz para Cliente
export interface Cliente {
	id: string;
	nombre: string;
	email: string;
	telefono: string;
	fechaRegistro: string;
	estado: 'activo' | 'inactivo' | 'suspendido';
	casosActivos: number;
}

// Interfaz para Caso (Equivalente a Order en el sistema de pagos)
export interface Caso {
	id: string;
	numericId?: number;
	userName: string;
	userEmail: string;
	status: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO' | 'FALLIDO';
	createdAt: string;
	updatedAt: string;
	total: number;
	items: Array<{
		serviceId: string;
		serviceName: string;
		price: number;
	}>;
	lawyerId?: string;
	paymentId?: string;
}

// Interfaz para transacciones financieras
export interface Transaccion {
	id: string;
	concepto: string;
	monto: number;
	fecha: string;
	tipo: 'ingreso' | 'gasto' | 'pago_abogado';
	estado: 'completado' | 'pendiente' | 'cancelado';
	cliente?: string;
	abogado?: string;
	caso?: string;
	metodoPago?: string;
}

// Tipos para las secciones del panel de admin
export type SeccionAdmin =
	| 'dashboard'
	| 'casos'
	| 'clientes'
	| 'abogados'
	| 'finanzas'
	| 'estadisticas'
	| 'configuracion'
	| 'pasarelas'
	| 'historial';

// Tipo unión para elementos seleccionables en el admin
export type ElementoSeleccionable = Abogado | Cliente | Caso | Transaccion | null;
