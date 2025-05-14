'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiMail, FiArrowLeft, FiCheck } from 'react-icons/fi';
import logo from '../../../public/logo/logo_sf_1.png';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [step, setStep] = useState<'email' | 'confirmation'>('email');

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEmail(value);
    
    // Limpiar error cuando el usuario comienza a escribir
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario
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
    
    // Enviar solicitud
    setIsSubmitting(true);
    
    try {
      // Aquí iría la llamada a la API para solicitar el restablecimiento de contraseña
      // Por ahora, simulamos una respuesta exitosa después de 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitSuccess(true);
      setStep('confirmation');
    } catch (error) {
      console.error('Error al enviar la solicitud:', error);
      setErrors({
        form: 'Ocurrió un error al enviar la solicitud. Por favor, inténtalo de nuevo más tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <Image 
              src={logo} 
              alt="VirtuAbogado Logo" 
              width={180} 
              height={60} 
              className="mx-auto"
            />
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-azul-primario">
            Recuperar contraseña
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'email' ? 
              'Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu contraseña.' :
              'Revisa tu bandeja de entrada para seguir las instrucciones.'
            }
          </p>
        </div>
        
        {step === 'email' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10"
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Correo electrónico
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-3 border ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-azul-primario focus:border-azul-primario sm:text-sm`}
                    placeholder="tu@email.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
              
              {errors.form && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{errors.form}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
                </button>
              </div>
            </form>
            
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    ¿Recordaste tu contraseña?
                  </span>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="font-medium text-azul-primario hover:text-azul-primario/80 flex items-center justify-center gap-1"
                >
                  <FiArrowLeft className="h-4 w-4" />
                  <span>Volver al inicio de sesión</span>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center"
          >
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <FiCheck className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Solicitud enviada</h3>
            <p className="mt-2 text-sm text-gray-500">
              Hemos enviado un correo electrónico a <strong>{email}</strong> con instrucciones para restablecer tu contraseña.
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Si no recibes el correo en unos minutos, revisa tu carpeta de spam o correo no deseado.
            </p>
            
            <div className="mt-6">
              <Link
                href="/login"
                className="font-medium text-azul-primario hover:text-azul-primario/80 flex items-center justify-center gap-1"
              >
                <FiArrowLeft className="h-4 w-4" />
                <span>Volver al inicio de sesión</span>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}