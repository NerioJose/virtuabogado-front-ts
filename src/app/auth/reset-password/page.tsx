'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiLoader, FiArrowRight } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';

/**
 * ResetPasswordPage: Pantalla Premium de cambio de clave.
 * Recibe el token por URL y lo valida contra nuestra API.
 */
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
            </main>
        }>
            <ResetPasswordContent />
        </Suspense>
    );
}

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Enlace inválido o incompleto. Por favor, solicita uno nuevo.');
        }
    }, [token]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!token) {
            setError('No se encontró un token de recuperación válido.');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/reset-password/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al actualizar la contraseña');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 4000);

        } catch (err: any) {
            console.error('Error al actualizar contraseña:', err);
            setError(err.message || 'Error técnico al procesar el cambio');
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
                        <Image 
                            src="/logo/logo_sf_1.png" 
                            alt="VirtuAbogado" 
                            width={200} 
                            height={70} 
                            className="mx-auto"
                        />
                    </Link>
                </div>

                <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-8 md:p-10 border border-white relative overflow-hidden">
                    {/* Decoration */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-azul-primario/5 rounded-full blur-3xl -mr-16 -mt-16" />

                    <AnimatePresence mode="wait">
                        {!success ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="relative z-10"
                            >
                                <div className="mb-8">
                                    <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Nueva Contraseña</h1>
                                    <p className="text-sm font-bold text-slate-500 leading-relaxed">Protege tu acceso legal configurando una clave segura y robusta.</p>
                                </div>

                                <form onSubmit={handleUpdatePassword} className="space-y-6">
                                    {/* Password Field */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                                        <div className="relative">
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 focus:ring-2 focus:ring-azul-primario/20 focus:border-azul-primario outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                                                placeholder="••••••••"
                                                required
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-azul-primario transition-colors p-1"
                                            >
                                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Contraseña</label>
                                        <div className="relative">
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-azul-primario/20 focus:border-azul-primario outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3"
                                        >
                                            <FiAlertCircle className="text-red-500 shrink-0 mt-0.5" />
                                            <p className="text-xs font-bold text-red-700">{error}</p>
                                        </motion.div>
                                    )}

                                    <button 
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-azul-primario text-white font-black text-xs uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-azul-primario/25 hover:bg-azul-primario/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                                    >
                                        {isLoading ? (
                                            <FiLoader className="animate-spin" />
                                        ) : (
                                            <>
                                                Actualizar Contraseña
                                                <FiArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-6 relative z-10"
                            >
                                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                    <FiCheckCircle className="text-emerald-500 text-5xl" />
                                </div>
                                <h1 className="text-2xl font-black text-slate-800 tracking-tight mb-2">¡Todo listo!</h1>
                                <p className="text-sm font-bold text-slate-500 leading-relaxed mb-10">Tu contraseña ha sido actualizada con éxito.<br/>Redirigiéndote a tu panel legal...</p>
                                
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 3.5, ease: "linear" }}
                                        className="bg-emerald-500 h-full"
                                    />
                                </div>
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Iniciando sesión segura...</p>
                            </motion.div>
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
