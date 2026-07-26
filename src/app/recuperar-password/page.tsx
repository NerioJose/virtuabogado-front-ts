'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { 
    FiMail, FiLock, FiArrowLeft, FiCheckCircle, 
    FiLoader, FiAlertCircle, FiEye, FiEyeOff, FiArrowRight 
} from 'react-icons/fi';

/**
 * RecuperarPasswordPage: Componente Maestro Dinámico.
 * Maneja tanto la SOLICITUD como el CAMBIO de clave en una sola ruta.
 */
export default function RecuperarPasswordPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
            </main>
        }>
            <RecuperarPasswordContent />
        </Suspense>
    );
}

function RecuperarPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenFromUrl = searchParams.get('token');

    // Estados para SOLICITUD (Email)
    const [email, setEmail] = useState('');
    const [requestStep, setRequestStep] = useState<'email' | 'confirmation'>('email');

    // Estados para RESET (Nueva Clave)
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);

    // Estados Generales
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // 1. Lógica para SOLICITAR el correo
    const handleRequestReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return setErrors({ email: 'El correo es obligatorio' });

        setIsLoading(true);
        setErrors({});

        try {
            const response = await fetch('/api/auth/reset-password/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                setRequestStep('confirmation');
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Error al procesar la solicitud');
            }
        } catch (error: any) {
            setErrors({ form: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    // 2. Lógica para CAMBIAR la contraseña (con token)
    const handleConfirmReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        if (password.length < 6) return setErrors({ form: 'La clave debe tener al menos 6 caracteres' });
        if (password !== confirmPassword) return setErrors({ form: 'Las contraseñas no coinciden' });

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: tokenFromUrl, password })
            });

            if (response.ok) {
                setResetSuccess(true);
                setTimeout(() => router.push('/login'), 4000);
            } else {
                const data = await response.json();
                throw new Error(data.error || 'Token inválido o expirado');
            }
        } catch (error: any) {
            setErrors({ form: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_#e8f4fd_0%,_transparent_100%)]">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <Link href="/">
                        <Image src="/logo/logo_sf_1.png" alt="VirtuAbogado" width={200} height={70} className="mx-auto" />
                    </Link>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-8 md:p-10 border border-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-azul-primario/5 rounded-full blur-3xl -mr-16 -mt-16" />

                    <AnimatePresence mode="wait">
                        {/* CASO A: SI HAY UN TOKEN -> MOSTRAR CAMBIO DE CLAVE */}
                        {tokenFromUrl ? (
                            !resetSuccess ? (
                                <motion.div 
                                    key="reset-form" 
                                    initial={{ opacity: 0, x: 20 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    exit={{ opacity: 0, x: -20 }}
                                    className="relative z-10"
                                >
                                    <div className="mb-8">
                                        <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Nueva Contraseña</h1>
                                        <p className="text-sm font-bold text-slate-500 leading-relaxed">Configura tu clave segura para proteger tu acceso legal.</p>
                                    </div>

                                    <form className="space-y-6" onSubmit={handleConfirmReset}>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                                            <div className="relative">
                                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input 
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-azul-primario/20 outline-none font-bold text-slate-700"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 p-1">
                                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar</label>
                                            <div className="relative">
                                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input 
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-azul-primario/20 outline-none font-bold text-slate-700"
                                                    placeholder="••••••••"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {errors.form && (
                                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                                                <FiAlertCircle className="text-red-500" />
                                                <p className="text-xs font-bold text-red-700">{errors.form}</p>
                                            </div>
                                        )}

                                        <button disabled={isLoading} className="w-full py-4 bg-azul-primario text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-azul-primario/90 transition flex items-center justify-center gap-2">
                                            {isLoading ? <FiLoader className="animate-spin" /> : 'Actualizar Contraseña'}
                                        </button>
                                    </form>
                                </motion.div>
                            ) : (
                                <motion.div key="reset-success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                        <FiCheckCircle className="text-emerald-500 text-4xl" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">¡Todo listo!</h2>
                                    <p className="text-sm font-bold text-slate-500 leading-relaxed">Tu clave ha sido actualizada. Redirigiéndote al panel...</p>
                                </motion.div>
                            )
                        ) : (
                            /* CASO B: NO HAY TOKEN -> MOSTRAR SOLICITUD DE EMAIL */
                            requestStep === 'email' ? (
                                <motion.div key="request-form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="relative z-10">
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Recuperar Acceso</h2>
                                        <p className="text-sm font-bold text-slate-500 leading-relaxed">Ingresa tu correo para recibir instrucciones de seguridad.</p>
                                    </div>

                                    <form className="space-y-6" onSubmit={handleRequestReset}>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                                            <div className="relative">
                                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input 
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-azul-primario/20 outline-none font-bold text-slate-700"
                                                    placeholder="ejemplo@correo.com"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {errors.form && (
                                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                                                <FiAlertCircle className="text-red-500" />
                                                <p className="text-xs font-bold text-red-700">{errors.form}</p>
                                            </div>
                                        )}

                                        <button disabled={isLoading} className="w-full py-4 bg-azul-primario text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-azul-primario/90 transition flex items-center justify-center gap-2">
                                            {isLoading ? <FiLoader className="animate-spin" /> : 'Enviar Instrucciones'}
                                        </button>
                                    </form>

                                    <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                                        <Link href="/login" className="text-xs font-black text-azul-primario uppercase tracking-widest hover:text-azul-primario/80 flex items-center justify-center gap-2">
                                            <FiArrowLeft /><span>Volver al inicio</span>
                                        </Link>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div key="request-success" className="text-center py-6">
                                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 mb-8">
                                        <FiCheckCircle className="h-10 w-10 text-emerald-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-2">¡Solicitud Enviada!</h3>
                                    <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">
                                        Si <strong className="text-azul-primario">{email}</strong> está registrado, recibirás un enlace de recuperación.
                                    </p>
                                    <Link href="/login" className="text-xs font-black text-azul-primario uppercase tracking-widest bg-slate-100 py-3 px-6 rounded-xl hover:bg-slate-200 block">
                                        Entendido, volver
                                    </Link>
                                </motion.div>
                            )
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center mt-10 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                    &copy; 2026 VirtuAbogado — Seguridad Legal Premium
                </p>
            </motion.div>
        </main>
    );
}