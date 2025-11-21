'use client';

import { motion } from 'framer-motion';
import { lazy, Suspense, useMemo } from 'react';
//import Image from 'next/image';
//import Link from 'next/link';

// Lazy loading de componentes
const FormularioContacto = lazy(() => import('../../components/contacto/FormularioContacto'));
const InformacionContacto = lazy(() => import('../../components/contacto/InformacionContacto'));
const SeccionMapa = lazy(() => import('../../components/contacto/SeccionMapa'));
const SeccionFAQ = lazy(() => import('../../components/contacto/SeccionFAQ'));

export default function ContactoPage() {

  // Memoizar las animaciones del hero para optimizar rendimiento
  const heroAnimation = useMemo(() => ({
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  }), []);

  // Componente de loading optimizado
  const LoadingSpinner = useMemo(() => (
    <div className="flex justify-center items-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azul-primario"></div>
    </div>
  ), []);

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-azul-claro/30 to-white">
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            {...heroAnimation}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-azul-primario leading-tight mb-6">
              <span className="text-vinotinto">Contáctanos</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-700">
              Estamos aquí para ayudarte. Envíanos un mensaje y nos pondremos en contacto contigo lo antes posible.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Formulario de Contacto y Datos */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Formulario */}
            <Suspense fallback={LoadingSpinner}>
              <FormularioContacto />
            </Suspense>
            
            {/* Información de contacto */}
            <Suspense fallback={LoadingSpinner}>
              <InformacionContacto />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Mapa */}
      <section className="py-16 bg-azul-claro/20">
        <div className="container mx-auto px-6">
          <Suspense fallback={LoadingSpinner}>
            <SeccionMapa />
          </Suspense>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <Suspense fallback={LoadingSpinner}>
            <SeccionFAQ />
          </Suspense>
        </div>
      </section>
    </main>
  );
}