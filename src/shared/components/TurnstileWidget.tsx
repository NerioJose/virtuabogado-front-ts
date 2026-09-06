'use client';

import { useEffect, useRef } from 'react';

declare global {
    interface Window {
        turnstile?: any;
        onTurnstileLoad?: () => void;
    }
}

/**
 * Widget de Cloudflare Turnstile.
 * Si la Site Key no está configurada, no renderiza nada (el captcha se degrada).
 */
export const TurnstileWidget = ({ onToken }: { onToken: (token: string) => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    useEffect(() => {
        if (!siteKey || !containerRef.current || typeof window === 'undefined') return;

        const renderWidget = () => {
            if (window.turnstile && containerRef.current) {
                window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => onTokenRef.current(token),
                    'expired-callback': () => onTokenRef.current(''),
                    'error-callback': () => onTokenRef.current(''),
                    size: 'flexible',
                });
            }
        };

        if (window.turnstile) {
            renderWidget();
            return;
        }

        window.onTurnstileLoad = () => renderWidget();

        if (!document.querySelector('script[data-turnstile]')) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad';
            script.async = true;
            script.defer = true;
            script.dataset.turnstile = '';
            document.body.appendChild(script);
        }

        return () => {
            if (window.turnstile && containerRef.current) {
                window.turnstile.remove(containerRef.current);
            }
        };
    }, [siteKey]);

    if (!siteKey) return null;

    return (
        <div className="flex justify-center">
            <div ref={containerRef} className="cf-turnstile" />
        </div>
    );
};