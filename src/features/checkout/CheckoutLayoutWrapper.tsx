'use client';

import React from 'react';
import { CheckoutModal } from './components/CheckoutModal';
import { CartRecovery } from './components/CartRecovery';

export const CheckoutLayoutWrapper = () => {
    return (
        <>
            <CheckoutModal />
            <CartRecovery />
        </>
    );
};
