'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import logo from '../../public/logo/logo_sf_1.png';

interface FormData {
  email: string;
  password: string;
  remember: boolean;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    remember: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar los datos al backend
    console.log('Datos del formulario:', formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white to-azul-claro/20 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        className="w-full max-w-md space-y-8 glass-card p-8 sm:p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center">
          <Link href="/">
            <motion.div
              className="relative flex items-center mb-6"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Image
                src={logo}
                alt="Logo VirtuAbogado"
                width={150}
                height={70}
                className="relative z-10"
              />
            </motion.div>
          </Link>
          <h2 className="mt-4 text-3xl font-bold text-azul-primario">Crear cuenta</h2>
          <p className="mt-2 text-sm text-gray-600">
            Únete a nuestra plataforma de asesoría legal
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-azul-primario">
                Correo electrónico
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition-all duration-200"
                  placeholder="tu@ejemplo.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-azul-primario">
                Contraseña
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition-all duration-200"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 text-vinotinto border-gray-300 rounded focus:ring-vinotinto"
              />
              <label htmlFor="remember" className="ml-2 block text-sm text-gray-600">
                Recordarme
              </label>
            </div>
            <div className="text-sm">
              <Link href="#" className="font-medium text-vinotinto hover:text-vinotinto-light transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="btn-primary w-full flex justify-center"
            >
              Registrarse
            </button>
          </div>

          <div className="text-center text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="font-medium text-vinotinto hover:text-vinotinto-light transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}