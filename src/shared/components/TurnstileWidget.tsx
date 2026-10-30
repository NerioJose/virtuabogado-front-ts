'use client';

import { useEffect, useRef } from 'react';
import { TURNSTILE_SITE_KEY } from '@/lib/turnstile-client';

interface TurnstileRenderOptions {
    sitekey: string;
    callback: (token: string) => void;
    'expired-callback': () => void;
    'error-callback': () => void;
    size?: 'normal' | 'flexible' | 'compact';
}

interface TurnstileApi {
    render(container: HTMLElement, options: TurnstileRenderOptions): void;
    remove(container: HTMLElement): void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
        onTurnstileLoad?: () => void;
    }
}

/**
 * Widget de Cloudflare Turnstile.
 * Si la Site Key no está configurada, no renderiza nada (el captcha se degrada).
 */
export const TurnstileWidget = ({ onToken }: { onToken: (token: string) => void }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const siteKey = TURNSTILE_SITE_KEY;
    const onTokenRef = useRef(onToken);
    onTokenRef.current = onToken;

    useEffect(() => {
        const container = containerRef.current;
        if (!siteKey || !container || typeof window === 'undefined') return;

        const renderWidget = () => {
            if (window.turnstile && container) {
                window.turnstile.render(container, {
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
            if (window.turnstile && container) {
                window.turnstile.remove(container);
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
