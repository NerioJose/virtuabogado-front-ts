/**
 * Barrel export para el feature orders
 * Facilita las importaciones en otros módulos
 */

// Store
export { useOrdersStore, initializeOrders } from './store/ordersStore';

// Hooks
export { useOrders } from './hooks/useOrders';

// Services
export { ordersService } from './services/orders.service';

// Types
export type {
    Order,
    OrderItem,
    OrdersState,
    OrdersFilters,
    CreateOrderRequest,
    UpdateOrderStatusRequest,
} from './types/orders.types';

export { OrderStatus, PaymentMethod } from './types/orders.types';
