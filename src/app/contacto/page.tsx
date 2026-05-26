'use client';

import { motion } from 'framer-motion';
import { lazy, Suspense, useMemo } from 'react';
import SeccionMapa from '@/components/contacto/SeccionMapa';

// Lazy loading de componentes pesados
const FormularioContacto = lazy(() => import('@/components/contacto/FormularioContacto'));
const InformacionContacto = lazy(() => import('@/components/contacto/InformacionContacto'));
const SeccionFAQ = lazy(() => import('@/components/contacto/SeccionFAQ'));

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  'mainEntity': [
    {
      '@type': 'Question',
      'name': '¿Cuánto tiempo toma una consulta legal?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Una consulta inicial típicamente dura entre 30 a 60 minutos, dependiendo de la complejidad del caso. Durante este tiempo, evaluamos tu situación y te proporcionamos una orientación inicial.'
      }
    },
    {
      '@type': 'Question',
      'name': '¿Ofrecen consultas gratuitas?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Sí, ofrecemos una consulta inicial gratuita de 15 minutos para evaluar tu caso y determinar cómo podemos ayudarte. Esto nos permite entender tus necesidades antes de proceder.'
      }
    },
    {
      '@type': 'Question',
      'name': '¿En qué áreas del derecho se especializan?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Contamos con especialistas en derecho civil, mercantil, laboral y familiar. VirtuAbogado tiene amplia experiencia en contratos, disputas comerciales, asuntos laborales y procedimientos familiares.'
      }
    },
    {
      '@type': 'Question',
      'name': '¿Cómo funcionan los honorarios?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Nuestros honorarios varían según el tipo de servicio y la complejidad del caso. Ofrecemos tarifas transparentes y te proporcionaremos un presupuesto detallado antes de comenzar cualquier trabajo.'
      }
    }
  ]
};

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
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
          <SeccionMapa />
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <Suspense fallback={LoadingSpinner}>
            <SeccionFAQ />
          </Suspense>
        </div>
      </section>
    </main>
  );
}