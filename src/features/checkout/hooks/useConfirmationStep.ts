import { useEffect } from 'react';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useRouter } from 'next/navigation';
import { useCheckout } from '../hooks/useCheckout';

export const useConfirmationStep = () => {
    const { orderId, service, userData, closeCheckout, paymentMethod, reset } = useCheckout();
    const router = useRouter();
    
    // 📡 MONITOREO FINTECH: Polling de alta frecuencia
    const needsWaiting = (paymentMethod as string) === 'zenobank' || (paymentMethod as string) === 'crypto';
    
    const { data: statusData } = useOrderStatus(orderId, needsWaiting);
    
    const isSuccess = statusData?.status === 'PAID';
    const isPendingConfirmation = needsWaiting && !isSuccess;

    useEffect(() => {
        if (!isPendingConfirmation) {
            const timer = setTimeout(() => {
                reset();
                closeCheckout();
                router.push('/mis-servicios');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [isPendingConfirmation, closeCheckout, router, reset]);

    const handleClose = () => {
        reset();
        closeCheckout();
    };

    return {
        orderId,
        service,
        userData,
        isPendingConfirmation,
        handleClose
    };
};
