'use client';

/**
 * Formulario de inicio de sesión - Refactorizado con nueva arquitectura
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/Button/Button';
import { Input } from '@/shared/components/ui/Input/Input';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '@/shared/types/entities.types';
import { ROUTES } from '@/shared/constants/routes';

export function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rolSeleccionado, setRolSeleccionado] = useState<UserRole>(
        UserRole.ADMIN
    );

    const { login, isLoading, error } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await login({
                email,
                password,
                rol: rolSeleccionado,
            });
        } catch (err) {
            // El error ya se maneja en el hook useAuth
            console.error('Login error:', err);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-gray-100 px-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="glass-card p-8 md:p-10 w-full max-w-md">
                <form
                    onSubmit={handleSubmit}
                    className="grid w-full max-w-sm grid-cols-1 gap-6">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-vinotinto rounded-lg flex items-center justify-center">
                            <svg
                                className="w-5 h-5 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                                />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-azul-primario">
                            VirtuAbogado
                        </span>
                    </div>

                    <h2 className="text-2xl font-bold text-azul-primario">
                        Iniciar sesión
                    </h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <Input
                        type="email"
                        label="Correo electrónico"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Para desarrollo, puedes dejar esto vacío"
                    />

                    <Input
                        type="password"
                        label="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Para desarrollo, puedes dejar esto vacío"
                    />

                    {/* Selector de rol para desarrollo */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Rol para desarrollo
                        </label>
                        <div className="flex space-x-4 mt-2">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="rol"
                                    value={UserRole.ADMIN}
                                    checked={rolSeleccionado === UserRole.ADMIN}
                                    onChange={() => setRolSeleccionado(UserRole.ADMIN)}
                                    className="mr-2 h-4 w-4 text-azul-primario focus:ring-azul-primario"
                                />
                                Administrador
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="rol"
                                    value={UserRole.ABOGADO}
                                    checked={rolSeleccionado === UserRole.ABOGADO}
                                    onChange={() => setRolSeleccionado(UserRole.ABOGADO)}
                                    className="mr-2 h-4 w-4 text-azul-primario focus:ring-azul-primario"
                                />
                                Abogado
                            </label>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="remember"
                                className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
                            />
                            <span className="text-sm text-gray-700">Recordarme</span>
                        </label>
                        <Link
                            href={ROUTES.RECUPERAR_PASSWORD}
                            className="text-sm text-azul-primario hover:text-vinotinto transition-colors font-semibold">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>

                    <Button type="submit" isLoading={isLoading} className="w-full">
                        Iniciar sesión
                    </Button>

                    <p className="text-sm text-gray-600 text-center">
                        ¿No tienes una cuenta?{' '}
                        <Link
                            href={ROUTES.REGISTER}
                            className="text-azul-primario hover:text-vinotinto transition-colors font-semibold">
                            Regístrate
                        </Link>
                    </p>
                </form>
            </motion.div>
        </div>
    );
}
