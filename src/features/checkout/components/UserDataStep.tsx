'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiUser, FiPhone, FiLock, FiCheckCircle } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import type { UserCheckoutData } from '../types/checkout.types';

export const UserDataStep: React.FC = () => {
    const { 
        setUserData, 
        setStep, 
        isLoading, 
        isExistingUser, 
        checkUserExists, 
        sendOtp, 
        verifyOtp 
    } = useCheckout();
    
    const [showPassword, setShowPassword] = useState(false);
    const [isOtpMode, setIsOtpMode] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpCode, setOtpCode] = useState('');
    const [emailCheckLoading, setEmailCheckLoading] = useState(false);

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

    const handleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const error = validateField(name as keyof UserCheckoutData, value);
        if (error) {
            setErrors(prev => ({ ...prev, [name]: error }));
            return;
        }

        // Si es el email, verificar si existe el usuario
        if (name === 'email' && value) {
            setEmailCheckLoading(true);
            try {
                await checkUserExists(value);
            } finally {
                setEmailCheckLoading(false);
            }
        }
    };

    const handleRequestOtp = async () => {
        if (!formData.email) return;
        try {
            await sendOtp(formData.email);
            setOtpSent(true);
            setIsOtpMode(true);
        } catch (err) {
            console.error('Error sending OTP:', err);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otpCode || otpCode.length < 6) return;
        try {
            await verifyOtp(formData.email, otpCode);
        } catch (err) {
            console.error('Error verifying OTP:', err);
        }
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
                <span className="mr-2 text-xl">{isExistingUser ? '👋' : '🛡️'}</span>
                <p>
                    {isExistingUser 
                        ? '¡Qué bueno verte de nuevo! Ingresa tu contraseña o usa un código de acceso temporal.' 
                        : 'Crea tu cuenta segura para proteger tu compra y acceder al chat con tu abogado.'}
                </p>
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

            {/* Password / OTP Selector */}
            {!otpSent ? (
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Contraseña <span className="text-red-500">*</span>
                        </label>
                        {isExistingUser && (
                            <button 
                                type="button"
                                onClick={handleRequestOtp}
                                className="text-xs text-azul-primario hover:underline font-semibold"
                            >
                                ¿Olvidaste tu contraseña? Usar código
                            </button>
                        )}
                    </div>
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
                            placeholder={isExistingUser ? "Ingresa tu contraseña actual" : "Crea una contraseña segura"}
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
                    {!isExistingUser && <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres.</p>}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-5 bg-azul-primario/5 rounded-xl border border-azul-primario/20 text-center"
                >
                    <div className="text-4xl mb-3">📧</div>
                    <h3 className="font-bold text-azul-primario text-base mb-1">
                        ¡Revisa tu correo!
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Enviamos un <strong>enlace de acceso</strong> a <strong>{formData.email}</strong>.<br/>
                        Haz clic en ese enlace y volverás automáticamente al sitio con la sesión iniciada.
                    </p>
                    <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2">
                        ⏱️ El enlace expira en 1 hora · Revisa tu carpeta de spam si no aparece
                    </div>
                    <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={isLoading}
                        className="mt-4 text-xs text-azul-primario hover:underline disabled:opacity-50"
                    >
                        {isLoading ? 'Enviando...' : '¿No llegó? Reenviar enlace'}
                    </button>
                </motion.div>
            )}

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
