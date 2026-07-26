'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiSmartphone, FiDownload, FiX } from 'react-icons/fi';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useState, useEffect } from 'react';

export default function PWAInstallBanner() {
    const { isInstalled, isInstallable, isIOS, isStandalone, promptInstall } = usePWAInstall();
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('pwa_banner_dismissed') === 'true';
    });

    const handleDismiss = () => {
        localStorage.setItem('pwa_banner_dismissed', 'true');
        setDismissed(true);
    };

    if (isInstalled || isStandalone || dismissed) return null;

    if (!isInstallable && !isIOS) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-80"
            >
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 backdrop-blur-xl">
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-azul-primario/10 rounded-xl flex items-center justify-center shrink-0">
                                <FiSmartphone className="text-azul-primario" size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800">Instala VirtuAbogado</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {isIOS ? 'iOS' : 'Android'}
                                </p>
                            </div>
                        </div>
                        <button type="button" onClick={handleDismiss} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                            <FiX size={16} className="text-slate-400" />
                        </button>
                    </div>

                    {isIOS ? (
                        <div className="space-y-2">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Presiona <strong>Compartir</strong> <span className="text-lg">⎙</span> y luego <strong>Agregar a Inicio</strong> para recibir notificaciones incluso con la app cerrada.
                            </p>
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <p className="text-[10px] font-bold text-amber-700 leading-tight">
                                    💡 En iOS las notificaciones solo funcionan desde la app instalada en el Home Screen.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Instala la app en tu dispositivo para recibir notificaciones incluso con la aplicación cerrada.
                            </p>
                            <button type="button"
                                onClick={promptInstall}
                                className="w-full py-3 bg-azul-primario text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-azul-primario/90 transition flex items-center justify-center gap-2 shadow-lg shadow-azul-primario/20"
                            >
                                <FiDownload size={16} />
                                Instalar App
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
