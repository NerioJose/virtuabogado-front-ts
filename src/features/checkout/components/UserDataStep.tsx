'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiUser, FiPhone } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import { AutoLoginIndicator } from './AutoLoginIndicator';
import type { UserCheckoutData } from '../types/checkout.types';

export const UserDataStep: React.FC = () => {
    const { setUserData, setStep, isLoading } = useCheckout(); // Remove checkExistingUser dependency
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState<UserCheckoutData>({
        email: '',
        password: '', // Nuevo campo
        name: '',
        nombre: '',
        phone: '',
        createAccount: true,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof UserCheckoutData, string>>>({});

    const validateField = (name: keyof UserCheckoutData, value: string | boolean): string | undefined => {
        switch (name) {
            case 'email':
                if (!value) return 'Email requerido';
                if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Email inválido';
                }
                break;
            case 'name':
                if (!value) return 'Nombre requerido';
                if (typeof value === 'string' && value.trim().length < 3) {
                    return 'Nombre muy corto';
                }
                break;
            case 'password':
                if (!value) return 'Contraseña requerida';
                if (typeof value === 'string' && value.length < 6) return 'Mínimo 6 caracteres';
                break;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            const newData = { ...prev, [name]: newValue };
            if (name === 'name') newData.nombre = value as string;
            return newData;
        });

        if (errors[name as keyof UserCheckoutData]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const error = validateField(name as keyof UserCheckoutData, value);
        if (error) setErrors(prev => ({ ...prev, [name]: error }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newErrors: Partial<Record<keyof UserCheckoutData, string>> = {};

        // Validar campos
        ['email', 'name', 'password'].forEach((field) => {
            const error = validateField(field as keyof UserCheckoutData, formData[field as keyof UserCheckoutData] as string);
            if (error) newErrors[field as keyof UserCheckoutData] = error;
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Guardar datos y avanzar
        // La autenticación real ocurrirá en useCheckout -> submitUserData (o similar) 
        // pero por ahora pasamos los datos al store
        setUserData(formData);

        // NOTA: Para UX fluida, podríamos autenticar AQUÍ mismo antes de pasar al paso 2.
        // Pero el diseño actual de useCheckout parece manejarlo en el store.
        // Vamos a asumir que el chequeo de "registerOrLogin" se hace al intentar pagar o al transicionar.
        // MEJORA: Vamos a disparar la autenticación real en el siguiente paso o modificar el store.

        // En este refactor, simplemente guardamos y avanzamos. 
        // La lógica en checkoutStore.submitOrder usará esto.
        setStep(2);
    };

    return (
        <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 flex items-start">
                <span className="mr-2 text-xl">🛡️</span>
                <p>Crea tu cuenta segura (o inicia sesión) para proteger tu compra y acceder al chat con tu abogado.</p>
            </div>

            {/* Email */}
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="tu@email.com"
                    />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                    <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password || ''}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Crea una contraseña segura"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? "Ocultar" : "Mostrar"}
                    </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
                <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres. Si ya tienes cuenta, usa tu contraseña actual.</p>
            </div>

            {/* Nombre */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                        placeholder="Juan Pérez"
                    />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Teléfono */}
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono <span className="text-xs text-gray-500">(opcional)</span>
                </label>
                <div className="relative">
                    <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario"
                        placeholder="+58 424 123 4567"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary mt-6 flex justify-center items-center"
            >
                Continuar al Pago →
            </button>
        </motion.form>
    );
};
