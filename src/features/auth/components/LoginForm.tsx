'use client';

/**
 * Formulario de inicio de sesión - Versión de producción
 * El rol se detecta automáticamente según las credenciales del usuario
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/Button/Button';
import { Input } from '@/shared/components/ui/Input/Input';
import { ROUTES } from '@/shared/constants/routes';
import { useAuth } from '@/features/auth/hooks/useAuth';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);

    // Cargar preferencias guardadas al montar el componente
    useEffect(() => {
        const savedRemember = localStorage.getItem('remember_me');
        if (savedRemember !== null) {
            const isRemembered = savedRemember === 'true';
            setRemember(isRemembered);
            
            // Si recordamos, intentar cargar el email guardado
            if (isRemembered) {
                const savedEmail = localStorage.getItem('remember_email');
                if (savedEmail) setEmail(savedEmail);
            }
        }
    }, []);

    // Guardar preferencia de "Recordarme" cada vez que cambie
    useEffect(() => {
        localStorage.setItem('remember_me', remember.toString());
        if (!remember) {
            localStorage.removeItem('remember_email');
        }
    }, [remember]);

    // Usar useAuth hook para lógica de negocio (API + redirección)
    const { login, isLoading, error } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            return;
        }

        try {
            await login({
                email,
                password,
                remember,
            });

            // Si el login fue exitoso y "Recordarme" está activo, guardar email
            if (remember) {
                localStorage.setItem('remember_email', email);
            }
        } catch (err) {
            console.error('Login error:', err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-azul-claro/20 via-white to-vinotinto/10 px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass-card p-8 md:p-10 w-full max-w-md shadow-xl">
                <form
                    onSubmit={handleSubmit}
                    className="grid w-full max-w-sm grid-cols-1 gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-vinotinto to-azul-primario rounded-lg flex items-center justify-center shadow-md">
                            <svg
                                className="w-6 h-6 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                                />
                            </svg>
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-azul-primario to-vinotinto bg-clip-text text-transparent">
                            VirtuAbogado
                        </span>
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold text-azul-primario mb-2">
                            Bienvenido
                        </h2>
                        <p className="text-gray-600">
                            Inicia sesión para acceder a tu cuenta
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                            <svg
                                className="w-5 h-5 flex-shrink-0 mt-0.5"
                                fill="currentColor"
                                viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <Input
                        type="email"
                        label="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        required
                        autoComplete="email"
                    />

                    <div className="relative">
                        <Input
                            type={showPassword ? 'text' : 'password'}
                            label="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-9 text-gray-500 hover:text-azul-primario transition-colors">
                            {showPassword ? (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                name="remember"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario cursor-pointer"
                            />
                            <span className="text-sm text-gray-700">Recordarme</span>
                        </label>
                        <Link
                            href={ROUTES.RECUPERAR_PASSWORD}
                            className="text-sm text-azul-primario hover:text-vinotinto transition-colors font-semibold">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <Button
                        type="submit"
                        isLoading={isLoading}
                        className="w-full"
                        disabled={!email || !password}>
                        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </Button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">
                                ¿Eres nuevo?
                            </span>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 text-center leading-relaxed">
                        Compra un servicio para crear tu cuenta automáticamente y acceder a la plataforma.
                    </p>

                    <Link href="/servicios" className="block">
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full px-6 py-3 bg-gradient-to-r from-azul-primario to-vinotinto text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
                            Ver servicios disponibles
                        </motion.button>
                    </Link>
                </form>
            </motion.div>
        </div>
    );
}
