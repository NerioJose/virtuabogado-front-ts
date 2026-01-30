'use client';

import dynamic from 'next/dynamic';

const CheckoutLayoutWrapper = dynamic(
    () => import('./CheckoutLayoutWrapper').then(mod => ({ default: mod.CheckoutLayoutWrapper })),
    { ssr: false }
);

export const DynamicCheckoutWrapper = () => {
    return <CheckoutLayoutWrapper />;
};
