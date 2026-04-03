'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiMail, FiArrowLeft, FiCheckCircle, FiLoader, FiAlertCircle } from 'react-icons/fi';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'email' | 'confirmation'>('email');

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmail(value);

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'El correo electrónico es obligatorio';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/reset-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la solicitud');
      }

      setStep('confirmation');
    } catch (error: any) {
      console.error('Error en recuperar-password:', error);
      setErrors({
        form: error.message || 'Ocurrió un error al enviar el correo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,_#e8f4fd_0%,_transparent_100%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/">
            <Image
              src="/logo/logo_sf_1.png"
              alt="VirtuAbogado Logo"
              width={200}
              height={70}
              className="mx-auto"
            />
          </Link>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-blue-900/5 p-8 md:p-10 border border-white relative overflow-hidden">
            {/* Subtle highlight decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-azul-primario/5 rounded-full blur-3xl -mr-16 -mt-16" />
            
            <AnimatePresence mode="wait">
                {step === 'email' ? (
                <motion.div
                    key="step-email"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="relative z-10"
                >
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">
                        Recuperar Acceso
                        </h2>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed">
                        Ingresa tu correo electrónico y te enviaremos instrucciones de seguridad para restablecer tu cuenta.
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <FiMail className={`h-5 w-5 ${errors.email ? 'text-red-400' : 'text-slate-400'}`} />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={handleChange}
                                    className={`block w-full pl-12 pr-4 py-4 bg-slate-50/50 border ${
                                        errors.email ? 'border-red-200' : 'border-slate-200'
                                    } rounded-2xl focus:ring-2 focus:ring-azul-primario/20 focus:border-azul-primario outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all`}
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                            {errors.email && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">
                                {errors.email}
                            </motion.p>
                            )}
                        </div>

                        {errors.form && (
                            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
                                <FiAlertCircle className="text-red-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-bold text-red-700">{errors.form}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-azul-primario text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-azul-primario/90 transition-all shadow-lg shadow-azul-primario/25 disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <FiLoader className="animate-spin" />
                            ) : (
                                'Enviar Instrucciones'
                            )}
                        </button>
                    </form>

                    <div className="mt-10 pt-8 border-t border-slate-100 text-center">
                        <Link
                            href="/login"
                            className="text-xs font-black text-azul-primario uppercase tracking-widest hover:text-azul-primario/80 flex items-center justify-center gap-2 group"
                        >
                            <FiArrowLeft className="h-4 w-4 transform group-hover:-translate-x-1 transition-transform" />
                            <span>Volver al inicio de sesión</span>
                        </Link>
                    </div>
                </motion.div>
                ) : (
                <motion.div
                    key="step-confirmation"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-4 relative z-10"
                >
                    <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 mb-8">
                        <FiCheckCircle className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Solicitud Enviada</h3>
                    <p className="text-sm font-bold text-slate-500 leading-relaxed mb-8">
                        Hemos enviado un correo a <strong className="text-azul-primario">{email}</strong> con los pasos para restaurar tu acceso.
                    </p>
                    <div className="bg-slate-50 rounded-2xl p-4 mb-10 text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                        Si no lo recibes, revisa tu carpeta de Spam.
                    </div>

                    <Link
                        href="/login"
                        className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                        <FiArrowLeft />
                        Volver al inicio
                    </Link>
                </motion.div>
                )}
            </AnimatePresence>
        </div>

        <p className="text-center mt-10 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            © 2026 VirtuAbogado — Seguridad Legal Premium
        </p>
      </motion.div>
    </main>
  );
}