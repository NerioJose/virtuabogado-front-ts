import { useCheckoutStore } from '../store/checkoutStore';

/**
 * Hook principal para acceder al checkout
 * Proporciona todas las acciones y estado del checkout
 */
export const useCheckout = () => {
    const store = useCheckoutStore();

    return {
        // Estado
        isOpen: store.isOpen,
        step: store.step,
        service: store.service,
        userData: store.userData,
        paymentData: store.paymentData,
        paymentMethod: store.paymentMethod,
        orderId: store.orderId,
        total: store.total,
        isLoading: store.isLoading,
        error: store.error,
        isExistingUser: store.isExistingUser,

        // Acciones
        openCheckout: store.openCheckout,
        closeCheckout: store.closeCheckout,
        setStep: store.setStep,
        setUserData: store.setUserData,
        setPaymentData: store.setPaymentData,
        setPaymentMethod: store.setPaymentMethod,
        checkExistingUser: store.checkExistingUser,
        submitOrder: store.submitOrder,
        reset: store.reset,
    };
};
