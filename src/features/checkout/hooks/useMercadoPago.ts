'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
    interface Window {
        MercadoPago: any;
    }
}

interface MercadoPagoMountOptions {
    container: string;
    publicKey?: string;
    amountPen: number;
    orderId: string;
    payerEmail?: string;
    onSubmit: (formData: any) => void;
    onBinChange?: (bin: string) => void;
}

/**
 * Carga dinámicamente el SDK JS de MercadoPago y monta el Card Payment Brick.
 */
export function useMercadoPago() {
    const [sdkReady, setSdkReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const brickRef = useRef<any>(null);
    const mpRef = useRef<any>(null);

    // Cargar el SDK una sola vez de forma dinámica
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.MercadoPago) {
            setSdkReady(true);
            return;
        }

        const existing = document.getElementById('mp-sdk');
        if (existing && existing.getAttribute('data-load-state') === 'loaded') {
            setSdkReady(true);
            return;
        }

        const script = document.createElement('script');
        script.id = 'mp-sdk';
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.async = true;
        script.onload = () => {
            setSdkReady(true);
        };
        script.onerror = () => {
            setLoadError('No se pudo cargar el SDK de MercadoPago.');
        };
        document.head.appendChild(script);

        return () => {
            // No removemos el script para no perjudicar re-montajes
        };
    }, []);

    const destroyBrick = useCallback(async () => {
        const controller = brickRef.current;
        brickRef.current = null;
        if (!controller) return;
        try {
            if (typeof (controller as any).unmount === 'function') {
                await (controller as any).unmount();
            } else if (mpRef.current && typeof mpRef.current.bricks().cancel === 'function') {
                await mpRef.current.bricks().cancel('cardPaymentBrickController');
            }
        } catch {
            // ignorar errores de desmontaje
        }
    }, []);

    // mountCardBrick NO depende de opts.onSubmit: el componente pasa un onSubmit
    // estable que lee el callback actual desde un ref, evitando re-montajes por
    // cambios de referencia en cada render.
    const mountCardBrick = useCallback(async (opts: MercadoPagoMountOptions) => {
        const publicKey = opts.publicKey || '';
        if (!publicKey) {
            throw new Error('Public key de MercadoPago no configurada (MERCADOPAGO_PUBLIC_KEY).');
        }
        if (!window.MercadoPago) {
            throw new Error('SDK de MercadoPago no disponible.');
        }

        mpRef.current = new window.MercadoPago(publicKey);
        await destroyBrick();

        const settings = {
            initialization: {
                amount: opts.amountPen,
                payer: opts.payerEmail ? { email: opts.payerEmail } : {},
            },
            customization: {
                paymentMethods: {
                    minInstallments: 1,
                    maxInstallments: 1,
                },
            },
            callbacks: {
                onReady: () => {},
                onSubmit: opts.onSubmit,
                ...(opts.onBinChange ? { onBinChange: opts.onBinChange } : {}),
                onError: (error: any) => {
                    console.error('[MercadoPago] Brick error:', error);
                },
            },
        };

        try {
            brickRef.current = await mpRef.current.bricks().create('cardPayment', opts.container, settings);
        } catch (error: any) {
            brickRef.current = null;
            setLoadError(error?.message || 'Error al inicializar el pago con tarjeta.');
            throw error;
        }
    }, [destroyBrick]);

    const unmountCardBrick = useCallback(async () => {
        await destroyBrick();
    }, [destroyBrick]);

    // Carga el security.js de MP (Device ID) para mejorar la evaluación antifraude.
    // Retorna una promesa que resuelve cuando el script esté cargado (o si ya lo está).
    const loadSecurityScript = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            if (typeof window === 'undefined') return resolve();
            const existing = document.getElementById('mp-security');
            if (existing) return resolve();

            const script = document.createElement('script');
            script.id = 'mp-security';
            script.src = 'https://www.mercadopago.com/v2/security.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => resolve(); // no bloquear el pago si falla
            document.head.appendChild(script);
        });
    }, []);

    return {
        sdkReady,
        loadError,
        mountCardBrick,
        unmountCardBrick,
        loadSecurityScript,
    };
}