'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/Button/Button';
import { Input } from '@/shared/components/ui/Input/Input';
import { useRegisterForm } from '../hooks/useRegisterForm';
import { UserRole } from '@/shared/types/entities.types';
import { ROUTES } from '@/shared/constants/routes';

interface RegisterFormProps {
    defaultRole?: UserRole;
}

export function RegisterForm({ defaultRole = UserRole.CLIENTE }: RegisterFormProps) {
    const {
        formData,
        remember,
        setRemember,
        passwordError,
        isLoading,
        error,
        handleSubmit,
        handleChange,
    } = useRegisterForm(defaultRole);

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
                        {formData.rol === UserRole.ABOGADO ? 'Registro de Abogado' : 'Crear cuenta'}
                    </h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <Input
                        type="text"
                        label="Nombre completo"
                        value={formData.nombre}
                        onChange={(e) => handleChange('nombre', e.target.value)}
                        required
                    />

                    <Input
                        type="email"
                        label="Correo electrónico"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        required
                    />

                    <Input
                        type="tel"
                        label="Teléfono"
                        value={formData.telefono}
                        onChange={(e) => handleChange('telefono', e.target.value)}
                    />

                    <Input
                        type="password"
                        label="Contraseña"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        required
                    />

                    <Input
                        type="password"
                        label="Confirmar contraseña"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        error={passwordError}
                        required
                    />

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="remember"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario cursor-pointer"
                        />
                        <label htmlFor="remember" className="text-sm text-gray-700 cursor-pointer">
                            Recordarme
                        </label>
                    </div>

                    <Button type="submit" isLoading={isLoading} className="w-full">
                        Registrarse
                    </Button>

                    <p className="text-sm text-gray-600 text-center">
                        ¿Ya tienes una cuenta?{' '}
                        <Link
                            href={ROUTES.LOGIN}
                            className="text-azul-primario hover:text-vinotinto transition-colors font-semibold">
                            Inicia sesión
                        </Link>
                    </p>
                </form>
            </motion.div>
        </div>
    );
}
