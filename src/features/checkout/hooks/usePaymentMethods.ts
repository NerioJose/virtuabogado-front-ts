'use client';

import { useQuery } from '@tanstack/react-query';
import { getPaymentMethodsAction } from '../actions/paymentMethods';

export function usePaymentMethods(adminView: boolean = false) {
    return useQuery({
        queryKey: ['PaymentMethod', adminView],
        queryFn: () => getPaymentMethodsAction(adminView),
        staleTime: 0, 
        refetchOnWindowFocus: true,
    });
}
