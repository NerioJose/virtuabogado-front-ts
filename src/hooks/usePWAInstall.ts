'use client';

import { useState, useEffect } from 'react';

interface PWAInstallState {
    isInstalled: boolean;
    isInstallable: boolean;
    isIOS: boolean;
    isStandalone: boolean;
    promptInstall: () => Promise<void>;
}

export function usePWAInstall(): PWAInstallState {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const ua = navigator.userAgent;
        const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        setIsIOS(isIOSDevice);

        const standalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone === true;
        setIsStandalone(standalone);

        // Persistir instalación en localStorage: si ya instaló antes, no mostrar banner
        const installedFlag = localStorage.getItem('pwa_installed') === 'true';
        if (installedFlag || standalone) {
            setIsInstalled(true);
        }

        const handleBeforeInstall = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        const handleInstalled = () => {
            localStorage.setItem('pwa_installed', 'true');
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleInstalled);
        };
    }, []);

    const promptInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setIsInstalled(true);
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    return { isInstalled, isInstallable, isIOS, isStandalone, promptInstall };
}
