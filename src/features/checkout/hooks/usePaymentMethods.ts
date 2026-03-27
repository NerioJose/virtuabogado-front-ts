import { useQuery } from '@tanstack/react-query';
import { getPaymentMethodsAction } from '../actions/paymentMethods';

export function usePaymentMethods(adminView: boolean = false) {
    return useQuery({
        queryKey: ['PaymentMethods', adminView],
        queryFn: () => getPaymentMethodsAction(adminView),
        staleTime: 1000 * 60 * 5, // 5 minutos
    });
}
