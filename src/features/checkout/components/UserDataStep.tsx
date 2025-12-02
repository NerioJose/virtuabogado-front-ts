import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiUser, FiPhone } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import { AutoLoginIndicator } from './AutoLoginIndicator';
import type { UserCheckoutData } from '../types/checkout.types';

export const UserDataStep: React.FC = () => {
    const { setUserData, checkExistingUser, isExistingUser, setStep } = useCheckout();

    const [formData, setFormData] = useState<UserCheckoutData>({
        email: '',
        name: '',
        phone: '',
        createAccount: true, // Siempre true - todos los compradores deben tener cuenta
    });

    const [errors, setErrors] = useState<Partial<Record<keyof UserCheckoutData, string>>>({});
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // Validar email cuando cambie
    useEffect(() => {
        const checkEmail = async () => {
            if (formData.email && formData.email.includes('@')) {
                setIsCheckingEmail(true);
                await checkExistingUser(formData.email);
                setIsCheckingEmail(false);
            }
        };

        const timer = setTimeout(checkEmail, 500);
        return () => clearTimeout(timer);
    }, [formData.email, checkExistingUser]);

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
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;

        setFormData(prev => ({ ...prev, [name]: newValue }));

        // Limpiar error al escribir
        if (errors[name as keyof UserCheckoutData]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const error = validateField(name as keyof UserCheckoutData, value);
        if (error) {
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validar todos los campos
        const newErrors: Partial<Record<keyof UserCheckoutData, string>> = {};

        const emailError = validateField('email', formData.email);
        if (emailError) newErrors.email = emailError;

        const nameError = validateField('name', formData.name);
        if (nameError) newErrors.name = nameError;

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Guardar datos y avanzar
        setUserData(formData);
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
            {isExistingUser && (
                <AutoLoginIndicator userName={formData.name || 'usuario'} />
            )}

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
                        className={`
              w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario
              ${errors.email ? 'border-red-500' : 'border-gray-300'}
            `}
                        placeholder="tu@email.com"
                    />
                    {isCheckingEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-azul-primario border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
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
                        className={`
              w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario
              ${errors.name ? 'border-red-500' : 'border-gray-300'}
            `}
                        placeholder="Juan Pérez"
                    />
                </div>
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
            </div>

            {/* Teléfono (opcional) */}
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

            {/* Información sobre creación de cuenta automática */}
            {!isExistingUser && (
                <div className="p-3 bg-azul-claro/10 rounded-lg border border-azul-primario/20">
                    <p className="text-sm text-gray-700">
                        ℹ️ Se creará una cuenta automáticamente para el seguimiento de tu servicio.
                        <span className="block text-xs text-gray-500 mt-1">
                            Recibirás las credenciales por email
                        </span>
                    </p>
                </div>
            )}

            {/* Botón continuar */}
            <button
                type="submit"
                className="w-full btn-primary mt-6"
            >
                Continuar al Pago →
            </button>
        </motion.form>
    );
};
