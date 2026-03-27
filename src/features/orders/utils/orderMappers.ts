import { Order, OrderStatus } from '../types/orders.types';

/**
 * Mapea el estado de la orden del sistema a un estado visual para el cliente
 */
export const mapOrderStatusToVisual = (
    status: OrderStatus
): 'pendiente' | 'programado' | 'completado' | 'cancelado' => {
    switch (status) {
        case OrderStatus.PAGO_PENDIENTE:
        case OrderStatus.PENDIENTE:
            return 'pendiente';
        case OrderStatus.REVISION:
        case OrderStatus.EN_PROGRESO:
            return 'programado';
        case OrderStatus.COMPLETADO:
            return 'completado';
        case OrderStatus.PAGO_RECHAZADO:
        case OrderStatus.FALLIDO:
        case OrderStatus.CANCELADO:
            return 'cancelado';
        default:
            return 'pendiente';
    }
};

/**
 * Obtiene el texto descriptivo del estado
 */
export const getStatusText = (status: 'pendiente' | 'programado' | 'completado' | 'cancelado'): string => {
    switch (status) {
        case 'pendiente':
            return 'Pendiente de asignación';
        case 'programado':
            return 'En proceso';
        case 'completado':
            return 'Servicio completado';
        case 'cancelado':
            return 'Servicio cancelado';
        default:
            return 'Estado desconocido';
    }
};

/**
 * Obtiene las clases de color para el badge según el estado
 */
export const getStatusColor = (status: 'pendiente' | 'programado' | 'completado' | 'cancelado'): string => {
    switch (status) {
        case 'pendiente':
            return 'bg-yellow-100 text-yellow-800';
        case 'programado':
            return 'bg-blue-100 text-blue-800';
        case 'completado':
            return 'bg-green-100 text-green-800';
        case 'cancelado':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

/**
 * Formatea una fecha ISO a formato legible
 */
export const formatOrderDate = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

/**
 * Formatea una fecha ISO a formato con hora
 */
export const formatOrderDateTime = (date: string | Date): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Obtiene una descripción genérica del servicio basado en su nombre
 * En el futuro, esto vendría de un catálogo de servicios
 */
export const getServiceDescription = (serviceName: string): string => {
    const descriptions: Record<string, string> = {
        'Consultas Legales': 'Asesoría legal personalizada con un abogado especializado.',
        'Revisión de Documentos': 'Análisis y revisión profesional de documentos legales.',
        'Representación Legal': 'Representación profesional en procesos judiciales y extrajudiciales.',
        'Asesoría Empresarial': 'Servicios legales especializados para empresas y emprendedores.',
        'Derecho Familiar': 'Asesoramiento en asuntos de familia como divorcios, custodia y pensiones.',
        'Derecho Inmobiliario': 'Servicios legales relacionados con propiedades y arrendamientos.',
    };

    return descriptions[serviceName] || 'Servicio legal profesional contratado.';
};

/**
 * Mapea una Order completa a un formato simplificado para la UI de Mis Servicios
 */
export interface ServicioCliente {
    id: string;
    nombre: string;
    descripcion: string;
    fecha: string;
    estado: 'pendiente' | 'programado' | 'completado' | 'cancelado';
    precio: number;
    numeroOrden: string;
    fechaCita?: string;
    abogado?: string;
}

export const mapOrderToServicio = (order: Order): ServicioCliente => {
    // Obtener el primer servicio (actualmente solo soportamos un servicio por orden)
    const firstItem = order.items[0];
    const serviceName = firstItem?.serviceName || 'Servicio Legal';

    return {
        id: order.id,
        numeroOrden: order.id,
        nombre: serviceName,
        descripcion: getServiceDescription(serviceName),
        fecha: formatOrderDate(order.createdAt),
        estado: mapOrderStatusToVisual(order.status),
        precio: order.total,
        // Campos opcionales que se llenarán cuando haya backend
        fechaCita: undefined,
        abogado: undefined,
    };
};

/**
 * Ordena los servicios por fecha de creación (más reciente primero)
 */
export const sortServicesByDate = (services: ServicioCliente[]): ServicioCliente[] => {
    return [...services].sort((a, b) => b.numeroOrden.localeCompare(a.numeroOrden));
};

/**
 * Filtra servicios por estado
 */
export const filterServicesByStatus = (
    services: ServicioCliente[],
    status?: 'pendiente' | 'programado' | 'completado' | 'cancelado'
): ServicioCliente[] => {
    if (!status) return services;
    return services.filter(service => service.estado === status);
};
