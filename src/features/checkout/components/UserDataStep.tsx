'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMail, FiUser, FiPhone, FiLock, FiChevronRight, FiArrowLeft, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import type { UserCheckoutData } from '../types/checkout.types';
import { useAuthStore } from '@/features/auth/store/authStore';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Link from 'next/link';

export const UserDataStep: React.FC = () => {
    const { 
        userData: storeUserData,
        setUserData, 
        isLoading, 
        error: storeError,
        isExistingUser, 
        checkUserExists, 
        authenticateUser 
    } = useCheckout();

    // 1. Estados Locales
    const [email, setEmail] = useState(storeUserData?.email || '');
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [hasChecked, setHasChecked] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    const [formData, setFormData] = useState({
        password: '',
        name: storeUserData?.nombre || '',
        phone: storeUserData?.phone || '',
    });

    // 2. Debounce para verificación de Email
    useEffect(() => {
        const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        
        if (!isValidEmail) {
            setHasChecked(false);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingEmail(true);
            setLocalError(null);
            try {
                await checkUserExists(email);
                setHasChecked(true);
            } catch (err) {
                console.error('Error checking email:', err);
            } finally {
                setIsCheckingEmail(false);
            }
        }, 800); // Debounce de 800ms para no saturar

        return () => clearTimeout(timer);
    }, [email, checkUserExists]);

    // 3. Manejadores
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (localError) setLocalError(null);
    };

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (localError) setLocalError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validaciones básicas antes de enviar
        if (isExistingUser && !formData.password) {
            setLocalError('Por favor, ingrese su contraseña.');
            return;
        }
        if (!isExistingUser && (!formData.name || !formData.password)) {
            setLocalError('Por favor, complete todos los campos requeridos (*).');
            return;
        }

        const success = await authenticateUser({
            email,
            password: formData.password,
            name: formData.name,
            nombre: formData.name,
            phone: formData.phone,
            createAccount: !isExistingUser
        });

        if (!success) {
            setLocalError('Error de autenticación. Verifique sus datos.');
        }
    };

    const handleResetEmail = () => {
        setHasChecked(false);
        setEmail('');
        setFormData({ password: '', name: '', phone: '' });
    };

    const handleResetPassword = async () => {
        if (!email) return;
        try {
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();
            await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/perfil/seguridad`
            });
            setShowResetModal(true);
        } catch (err) {
            console.error('Error reset password:', err);
            setLocalError('No se pudo enviar el enlace de recuperación.');
        }
    };

    // 4. Renderizado de Errores
    const displayError = localError || storeError;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md mx-auto"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* ETAPA 1: Identificación (Email) */}
                <div className="relative">
                    <label htmlFor="email" className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                        Correo Electrónico
                    </label>
                    <div className="relative group">
                        <FiMail className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${hasChecked ? 'text-green-500' : 'text-gray-400 group-focus-within:text-azul-primario'}`} />
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={handleEmailChange}
                            disabled={hasChecked || isLoading}
                            className={`w-full pl-11 pr-12 py-4 bg-white border-2 rounded-2xl transition-all duration-300 outline-none
                                ${hasChecked 
                                    ? 'border-green-100 bg-green-50/30 text-gray-700' 
                                    : 'border-gray-100 focus:border-azul-primario focus:ring-4 focus:ring-azul-primario/5'
                                }
                                disabled:opacity-80
                            `}
                            placeholder="tu@email.com"
                            required
                        />
                        <AnimatePresence>
                            {isCheckingEmail && (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    exit={{ opacity: 0 }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2"
                                >
                                    <FiLoader className="animate-spin text-azul-primario" />
                                </motion.div>
                            )}
                            {hasChecked && !isLoading && (
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    type="button"
                                    onClick={handleResetEmail}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                                    title="Cambiar email"
                                >
                                    <FiArrowLeft />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* ETAPA 2: Autenticación Dinámica */}
                <AnimatePresence mode="wait">
                    {hasChecked && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-5 overflow-hidden pt-2"
                        >
                            <div className={`p-4 rounded-2xl border flex items-center gap-3 mb-2 transition-all duration-500 ${isExistingUser ? 'bg-azul-primario/5 border-azul-primario/10' : 'bg-vinotinto/5 border-vinotinto/10'}`}>
                                <div className="text-xl">
                                    {isExistingUser ? '👋' : '✨'}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-bold text-gray-800 leading-tight">
                                        {isExistingUser ? '¡Hola de nuevo!' : '¡Bienvenido a VirtuAbogado!'}
                                    </p>
                                    <p className="text-[11px] text-gray-500 font-medium">
                                        {isExistingUser 
                                            ? 'Hemos detectado tu cuenta. Introduce tu contraseña para continuar.' 
                                            : 'No tienes cuenta aún. Crea una ahora para asegurar tu caso.'}
                                    </p>
                                </div>
                            </div>

                            {/* Campo Nombre (Solo para nuevos) */}
                            {!isExistingUser && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                >
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                                        Nombre Completo <span className="text-red-400">*</span>
                                    </label>
                                    <div className="relative group">
                                        <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-azul-primario transition-colors" />
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-azul-primario focus:ring-4 focus:ring-azul-primario/5 transition-all outline-none"
                                            placeholder="Ej: Juan Pérez"
                                            required
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Campo Password (Ambos casos) */}
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                            >
                                <div className="flex justify-between items-center px-1 mb-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        {isExistingUser ? 'Tu Contraseña' : 'Crea una contraseña'} <span className="text-red-400">*</span>
                                    </label>
                                    {isExistingUser && (
                                        <button 
                                            type="button"
                                            onClick={handleResetPassword}
                                            className="text-[10px] font-bold text-azul-primario hover:underline"
                                        >
                                            ¿Olvidaste tu clave?
                                        </button>
                                    )}
                                </div>
                                <div className="relative group">
                                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-azul-primario transition-colors" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-azul-primario focus:ring-4 focus:ring-azul-primario/5 transition-all outline-none"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-azul-primario transition-colors"
                                    >
                                        <span className="text-[10px] font-bold uppercase tracking-wider">{showPassword ? 'Ocultar' : 'Ver'}</span>
                                    </button>
                                </div>
                            </motion.div>

                            {/* Campo Teléfono (Opcional, solo nuevos) */}
                            {!isExistingUser && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                                        WhatsApp / Teléfono <span className="text-[9px] text-gray-300 font-normal normal-case">(Opcional)</span>
                                    </label>
                                    <div className="relative group">
                                        <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-azul-primario transition-colors" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-azul-primario focus:ring-4 focus:ring-azul-primario/5 transition-all outline-none"
                                            placeholder="+58 412..."
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Botón de Acción Principal */}
                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-azul-primario text-white rounded-2xl font-bold shadow-lg shadow-azul-primario/25 hover:bg-azul-oscuro transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <FiLoader className="animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{isExistingUser ? 'Acceder y Continuar' : 'Crear Cuenta y Continuar'}</span>
                                        <FiChevronRight className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </motion.button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mensajes de Error Profesionales */}
                <AnimatePresence>
                    {displayError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3"
                        >
                            <FiAlertCircle className="text-red-500 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-[11px] font-bold text-red-800 uppercase tracking-widest mb-1">Error de Validación</p>
                                <p className="text-xs text-red-600 font-medium leading-relaxed">{displayError}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* PIE DEL PASO 1 */}
                <p className="text-center text-[10px] text-gray-400 font-medium px-4 leading-relaxed">
                    Al continuar, confirmas que has leído y aceptas nuestros{' '}
                    <Link href="/terminos" className="text-azul-primario font-bold hover:underline">Términos y condiciones</Link> y nuestra{' '}
                    <Link href="/privacidad" className="text-azul-primario font-bold hover:underline">Política de privacidad</Link>.
                </p>
            </form>

            {/* MODAL DE ÉXITO (PROYECTO) */}
            <ConfirmModal
                isOpen={showResetModal}
                variant="success"
                title="Correo Enviado"
                message={
                    <span>
                        Hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong>. 
                        Por favor revisa tu bandeja de entrada o spam.
                    </span>
                }
                confirmText="Entendido"
                showCancel={false}
                onConfirm={() => setShowResetModal(false)}
                onClose={() => setShowResetModal(false)}
            />
        </motion.div>
    );
};
