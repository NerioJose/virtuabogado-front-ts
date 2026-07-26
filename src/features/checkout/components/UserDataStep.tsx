'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { FiMail, FiUser, FiPhone, FiLock, FiChevronRight, FiArrowLeft, FiAlertCircle, FiLoader } from 'react-icons/fi';
import ConfirmModal from '@/components/ui/ConfirmModal';
import Link from 'next/link';
import { useUserDataStep } from '../hooks/useUserDataStep';

export const UserDataStep: React.FC = () => {
    const {
        email,
        isCheckingEmail,
        hasChecked,
        showPassword,
        setShowPassword,
        showResetModal,
        setShowResetModal,
        formData,
        displayError,
        isLoading,
        isExistingUser,
        handleInputChange,
        handleEmailChange,
        handleSubmit,
        handleResetEmail,
        handleResetPassword
    } = useUserDataStep();

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
                            name="email"
                            autoComplete="email"
                            value={email}
                            onChange={handleEmailChange}
                            disabled={hasChecked || isLoading}
                            className={`w-full pl-11 pr-12 py-4 bg-white border-2 rounded-2xl transition duration-300 outline-none
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
                            <div className={`p-4 rounded-2xl border flex items-center gap-3 mb-2 transition duration-500 ${isExistingUser ? 'bg-azul-primario/5 border-azul-primario/10' : 'bg-vinotinto/5 border-vinotinto/10'}`}>
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
                                            autoComplete="name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-azul-primario focus:ring-4 focus:ring-azul-primario/5 transition outline-none"
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
                                    <div className="flex flex-col">
                                        <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">
                                            {isExistingUser ? 'Tu Contraseña' : 'Crea una contraseña'} <span className="text-red-400">*</span>
                                        </label>
                                        {!isExistingUser && (
                                            <span className="text-[9px] text-azul-primario font-bold uppercase tracking-wider flex items-center gap-1">
                                                <FiLock size={8} /> Mínimo 6 caracteres
                                            </span>
                                        )}
                                    </div>
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
                                        autoComplete={isExistingUser ? "current-password" : "new-password"}
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-azul-primario focus:ring-4 focus:ring-azul-primario/5 transition outline-none"
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
                                            autoComplete="tel"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-azul-primario focus:ring-4 focus:ring-azul-primario/5 transition outline-none"
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
                                className="w-full py-4 bg-azul-primario text-white rounded-2xl font-bold shadow-lg shadow-azul-primario/25 hover:bg-azul-oscuro transition flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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
