import { useQuery } from '@tanstack/react-query';
import { getPaymentMethodsAction } from '../actions/paymentMethods';

export function usePaymentMethods() {
    return useQuery({
        queryKey: ['PaymentMethods'],
        queryFn: () => getPaymentMethodsAction(),
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}
