'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiShield, FiCheckCircle, FiArrowRight, FiArrowLeft, FiClock } from 'react-icons/fi';
import logo from '../../../public/logo/logo_sf_1.png';

// Tipos de datos
interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  duracion?: string;
  incluye?: string[];
}

export default function ResumenCompraPage() {
  const router = useRouter();

  // Estado para el servicio seleccionado (simulado, vendría de la URL o contexto)
  const [servicio] = useState<Servicio>({
    id: 1,
    nombre: 'Consulta Legal Virtual',
    descripcion: 'Asesoría legal personalizada con un abogado especializado a través de videoconferencia.',
    precio: 99.99,
    duracion: '60 minutos',
    incluye: [
      'Análisis de tu caso por un abogado especializado',
      'Asesoramiento legal personalizado',
      'Recomendaciones sobre los próximos pasos a seguir',
      'Documento resumen con las conclusiones principales'
    ]
  });

  // Estado para los datos del cliente (simulado, vendría de un formulario previo o del contexto de autenticación)
  const [datosCliente] = useState({
    nombre: 'Juan Pérez',
    email: 'juan.perez@ejemplo.com',
    telefono: '+34 612 345 678'
  });

  // Función para continuar al pago
  const continuarAlPago = () => {
    // Aquí podrías guardar información en localStorage o en un estado global
    // antes de redirigir al usuario a la página de pago
    router.push('/pago');
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src={logo}
              alt="VirtuAbogado Logo"
              width={180}
              height={60}
              className="mx-auto"
            />
          </Link>
          <h1 className="mt-6 text-3xl font-extrabold text-azul-primario">
            Resumen de tu compra
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Revisa los detalles de tu servicio antes de continuar con el pago
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white shadow overflow-hidden sm:rounded-lg mb-8"
        >
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Detalles del servicio</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Información sobre el servicio que estás adquiriendo</p>
            </div>
            <div className="text-2xl font-bold text-azul-primario">
              {servicio.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
            </div>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">{servicio.nombre}</h3>
              <p className="text-gray-600">{servicio.descripcion}</p>

              {servicio.duracion && (
                <div className="mt-4 flex items-center">
                  <FiClock className="text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">Duración: {servicio.duracion}</span>
                </div>
              )}
            </div>

            {servicio.incluye && servicio.incluye.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">El servicio incluye:</h4>
                <ul className="space-y-2">
                  {servicio.incluye.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <FiCheckCircle className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white shadow overflow-hidden sm:rounded-lg mb-8"
        >
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Información del cliente</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Datos de contacto para el servicio</p>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre completo</dt>
                <dd className="mt-1 text-sm text-gray-900">{datosCliente.nombre}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Correo electrónico</dt>
                <dd className="mt-1 text-sm text-gray-900">{datosCliente.email}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">Teléfono de contacto</dt>
                <dd className="mt-1 text-sm text-gray-900">{datosCliente.telefono}</dd>
              </div>
            </dl>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
          className="bg-white shadow overflow-hidden sm:rounded-lg mb-8"
        >
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Resumen del pedido</h2>
          </div>

          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">{servicio.nombre}</span>
              <span className="font-medium">{servicio.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
            </div>

            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">IVA (21%)</span>
              <span className="font-medium">{(servicio.precio * 0.21).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
            </div>

            <div className="flex justify-between py-4 font-bold">
              <span className="text-gray-900">Total a pagar</span>
              <span className="text-azul-primario text-xl">{(servicio.precio * 1.21).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:space-x-4">
          <Link
            href="/servicios"
            className="mt-4 sm:mt-0 inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario"
          >
            <FiArrowLeft className="mr-2" />
            Volver a servicios
          </Link>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={continuarAlPago}
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario"
          >
            Continuar al pago
            <FiArrowRight className="ml-2" />
          </motion.button>
        </div>

        <div className="mt-8 text-center">
          <div className="flex items-center justify-center text-sm text-gray-500 mb-2">
            <FiShield className="text-green-500 mr-2" />
            <span>Pago 100% seguro y encriptado</span>
          </div>
          <p className="text-xs text-gray-500">
            Al continuar, aceptas nuestros <Link href="/terminos" className="text-azul-primario hover:underline">Términos y Condiciones</Link> y <Link href="/privacidad" className="text-azul-primario hover:underline">Política de Privacidad</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}