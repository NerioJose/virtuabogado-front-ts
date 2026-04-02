'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import Image from 'next/image';
import Link from 'next/link';

import { useSearchParams } from 'next/navigation';

/**
 * ResetPasswordPage: Pantalla Premium de cambio de clave.
 * Recibe el token por URL y lo valida contra nuestra API.
 */
export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // 1. Verificar si hay un token válido en la URL
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

        // Validaciones Básicas
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
            
            // Redirigir al Login después de 3 segundos
            setTimeout(() => {
                router.push('/login');
            }, 3000);

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
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/">
                        <Image 
                            src="/logo/logo_sf_1.png" 
                            alt="VirtuAbogado" 
                            width={180} 
                            height={60} 
                            className="mx-auto"
                        />
                    </Link>
                </div>

                <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 p-8 border border-slate-100">
                    <AnimatePresence mode="wait">
                        {!success ? (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                            >
                                <h1 className="text-2xl font-bold text-slate-800 mb-2">Nueva Contraseña</h1>
                                <p className="text-slate-500 text-sm mb-8">Crea una clave segura para proteger tu cuenta de VirtuAbogado.</p>

                                <form onSubmit={handleUpdatePassword} className="space-y-5">
                                    {/* Password Field */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Contraseña</label>
                                        <div className="relative">
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-12 focus:ring-2 focus:ring-azul-primario/20 focus:border-azul-primario outline-none transition-all"
                                                placeholder="••••••••"
                                                required
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-azul-primario"
                                            >
                                                {showPassword ? <FiEyeOff /> : <FiEye />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Confirmar Contraseña</label>
                                        <div className="relative">
                                            <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-azul-primario/20 focus:border-azul-primario outline-none transition-all"
                                                placeholder="••••••••"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Error Message */}
                                    {error && (
                                        <motion.div 
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 border border-red-100"
                                        >
                                            <FiAlertCircle className="shrink-0" />
                                            {error}
                                        </motion.div>
                                    )}

                                    <button 
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-azul-primario hover:bg-azul-primario/90 text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Actualizando...
                                            </span>
                                        ) : 'Actualizar Contraseña'}
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-6"
                            >
                                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FiCheckCircle className="text-green-500 text-4xl" />
                                </div>
                                <h1 className="text-2xl font-bold text-slate-800 mb-2">¡Todo listo!</h1>
                                <p className="text-slate-500 mb-8">Tu contraseña ha sido actualizada correctamente. Redirigiéndote a tu panel...</p>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: '100%' }}
                                        transition={{ duration: 2 }}
                                        className="bg-green-500 h-full"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <p className="text-center mt-8 text-slate-400 text-xs">
                    &copy; 2026 VirtuAbogado — Asesoría Legal Premium.
                </p>
            </motion.div>
        </main>
    );
}
