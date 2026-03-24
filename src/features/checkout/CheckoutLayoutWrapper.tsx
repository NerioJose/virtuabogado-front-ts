'use client';

import React from 'react';
import { CheckoutModal } from './components/CheckoutModal';
import { CartRecovery } from './components/CartRecovery';
import { CheckoutStateSync } from './components/CheckoutStateSync';

export const CheckoutLayoutWrapper = () => {
    return (
        <>
            <CheckoutStateSync />
            <CheckoutModal />
            <CartRecovery />
        </>
    );
};
