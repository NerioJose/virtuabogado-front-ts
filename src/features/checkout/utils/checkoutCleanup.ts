import { useCheckoutStore } from '../store/checkoutStore';

/**
 * Limpieza del estado de checkout al concluir un pago (o al llegar a las
 * páginas de resultado /payment/success y /payment/error).
 *
 * Evita que, tras la navegación/recarga, el modal de checkout y el
 * CartRecovery reaparezcan encima de la página de resultado:
 *  - completedAt: impide que CartRecovery lo considere "carrito abandonado".
 *  - checkout_manually_closed: impide que useCheckoutStorage reabra el modal.
 *  - Se limpia el localStorage persistido y se resetea el store.
 */
export function cleanupCheckoutAfterPayment(): void {
    try {
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('checkout_manually_closed', 'true');
            window.localStorage.removeItem('virtuabogado_checkout');
            window.localStorage.removeItem('activeOrderId');
            window.localStorage.removeItem('virtuabogado_pending_order');
        }
    } catch {
        // ignorar errores de storage
    }

    try {
        const store = useCheckoutStore.getState();
        if (typeof store.markAsCompleted === 'function') {
            store.markAsCompleted();
        }
        if (typeof store.reset === 'function') {
            store.reset();
        }
    } catch {
        // ignorar errores del store
    }
}
