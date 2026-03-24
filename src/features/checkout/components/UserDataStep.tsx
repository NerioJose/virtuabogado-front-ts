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
        error,
        isExistingUser, 
        checkUserExists, 
        sendOtp, 
        verifyOtp 
    } = useCheckout();

    // Función para traducir errores técnicos a mensajes amigables
    const getFriendlyErrorMessage = (err: string | null) => {
        if (!err) return null;
        if (err.toLowerCase().includes('rate limit exceeded')) {
            return 'Límite de seguridad alcanzado. Por favor, espere unos minutos o use su contraseña para entrar ahora mismo.';
        }
        if (err.includes('Invalid login credentials')) {
            return 'Credenciales inválidas. Verifique su contraseña.';
        }
        return err;
    };

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
            <div className={`p-4 rounded-xl border flex items-start gap-4 transition-colors duration-300 ${isExistingUser ? 'bg-azul-primario/5 border-azul-primario/20 text-azul-primario' : 'bg-green-50 border-green-100 text-green-800'}`}>
                <div className="text-2xl mt-0.5">
                    {isExistingUser ? '🛡️' : '👤'}
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-sm mb-1 leading-tight">
                        {isExistingUser ? 'Cuenta Registrada' : 'Nueva Cuenta Segura'}
                    </p>
                    <p className="text-xs opacity-90 leading-normal">
                        {isExistingUser 
                            ? 'Se ha detectado una cuenta asociada a este correo electrónico. Por favor, valide su identidad para continuar con el trámite.' 
                            : 'Cree su cuenta para realizar el seguimiento legal de su caso y acceder a su espacio personal.'}
                    </p>
                </div>
            </div>

            {/* Email */}
            <div>
                <label htmlFor="email" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Correo Electrónico <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative group">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-azul-primario transition-colors" />
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-4 focus:ring-azul-primario/10 focus:border-azul-primario transition-all duration-200 outline-none ${errors.email ? 'border-red-500 bg-red-50/10' : 'border-gray-200 bg-gray-50/30'}`}
                        placeholder="ejemplo@email.com"
                    />
                    {emailCheckLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-azul-primario/20 border-t-azul-primario rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                {errors.email && (
                    <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                        <span>⚠️</span> {errors.email}
                    </motion.p>
                )}
            </div>

            {/* Password / OTP Selector */}
            {!otpSent ? (
                <div className="space-y-4">
                    {/* Sección Contraseña Tradicional */}
                    <div>
                        <label htmlFor="password" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {isExistingUser ? 'Contraseña Registrada' : 'Establecer Contraseña'} <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-azul-primario transition-colors text-lg">🔒</span>
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password || ''}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-4 focus:ring-azul-primario/10 focus:border-azul-primario transition-all duration-200 outline-none ${errors.password ? 'border-red-500 bg-red-50/10' : 'border-gray-200 bg-gray-50/30'}`}
                                placeholder={isExistingUser ? "••••••••" : "Cree una clave para su cuenta"}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-azul-primario transition-colors p-1"
                            >
                                {showPassword ? "Ocultar" : "Mostrar"}
                            </button>
                        </div>
                        {errors.password && (
                            <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                                <span>⚠️</span> {errors.password}
                            </motion.p>
                        )}
                    </div>

                    {/* Opción Alternativa Profesional para Usuarios Existentes */}
                    {isExistingUser && (
                        <div className="pt-2">
                            <div className="relative flex items-center justify-center mb-4">
                                <div className="absolute inset-0 border-t border-gray-100 w-full" />
                                <span className="relative px-3 bg-white text-[10px] uppercase tracking-[0.2em] font-bold text-gray-300">O BIEN</span>
                            </div>
                            
                            <button 
                                type="button"
                                onClick={handleRequestOtp}
                                disabled={isLoading}
                                className="w-full py-3 px-4 border-2 border-dashed border-azul-primario/30 rounded-xl text-azul-primario hover:bg-azul-primario/5 hover:border-azul-primario/50 transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50"
                            >
                                <span className="text-xl group-hover:scale-110 transition-transform duration-200">✉️</span>
                                <div className="text-left">
                                    <span className="block text-sm font-bold leading-tight">Acceso mediante enlace seguro</span>
                                    <span className="block text-[10px] opacity-70 uppercase tracking-wider font-semibold">Le enviaremos un correo de entrada rápida</span>
                                </div>
                            </button>

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -10 }} 
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-red-700"
                                >
                                    <span className="mt-0.5">⚠️</span>
                                    <p className="text-[11px] font-medium leading-tight">
                                        {getFriendlyErrorMessage(error)}
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-azul-primario/5 rounded-2xl border border-azul-primario/20 text-center shadow-sm"
                >
                    <div className="w-16 h-16 bg-azul-primario/10 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                        📨
                    </div>
                    <h3 className="font-bold text-azul-primario text-lg mb-2">
                        Autenticación enviada
                    </h3>
                    <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                        Se ha generado un enlace de acceso para <strong>{formData.email}</strong>.<br/>
                        Por favor, <strong>revise su bandeja de entrada</strong> para validar la sesión y continuar con su trámite legal.
                    </p>
                    
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-azul-primario/10 rounded-full text-[11px] text-gray-500 font-medium">
                        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                        Válido por 60 minutos
                    </div>

                    <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={isLoading}
                        className="mt-6 block w-full text-xs text-azul-primario hover:underline font-bold disabled:opacity-50 uppercase tracking-widest"
                    >
                        {isLoading ? 'Solicitando nuevo enlace...' : '¿No ha recibido el correo? Reenviar enlace'}
                    </button>
                </motion.div>
            )}

            {/* Nombre */}
            {!isExistingUser && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <label htmlFor="name" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Nombre Completo <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative group">
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-azul-primario transition-colors" />
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-4 focus:ring-azul-primario/10 focus:border-azul-primario transition-all duration-200 outline-none ${errors.name ? 'border-red-500 bg-red-50/10' : 'border-gray-200 bg-gray-50/30'}`}
                            placeholder="Juan Pérez"
                        />
                    </div>
                    {errors.name && (
                        <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
                            <span>⚠️</span> {errors.name}
                        </motion.p>
                    )}
                </motion.div>
            )}

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
