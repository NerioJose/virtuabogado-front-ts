'use client';

import Image from 'next/image';
import Link from 'next/link';
import { 
  motion,
  AnimatePresence
} from 'framer-motion';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-azul-claro/30 to-white z-0"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-azul-primario leading-tight">
                Asesoría legal <span className="text-vinotinto">profesional</span> a tu alcance
              </h1>
              <p className="text-lg md:text-xl text-gray-700 max-w-xl">
                Conectamos a clientes con abogados especializados para resolver tus consultas legales de manera rápida y eficiente.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/register">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary w-full sm:w-auto"
                  >
                    Comenzar ahora
                  </motion.button>
                </Link>
                <Link href="/servicios">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-white text-azul-primario border border-azul-primario rounded-xl hover:bg-azul-claro transition-all duration-300 w-full sm:w-auto"
                  >
                    Conoce nuestros servicios
                  </motion.button>
                </Link>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <div className="relative h-[400px] w-full">
                <Image
                  src="/images/hero-image.jpg"
                  alt="Asesoría legal profesional"
                  fill
                  className="object-cover rounded-xl shadow-lg"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-azul-primario/20 to-transparent rounded-xl"></div>
              </div>
              <div className="absolute -bottom-6 -left-6 p-6 bg-white rounded-xl shadow-lg glass-card max-w-xs">
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-azul-claro rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-azul-primario" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-azul-primario">100% Confiable</h3>
                </div>
                <p className="text-gray-600">Abogados verificados y con experiencia en diversas áreas del derecho.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Servicios Destacados */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Nuestros Servicios</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Ofrecemos una amplia gama de servicios legales para satisfacer tus necesidades.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Consultas Legales",
                description: "Resuelve tus dudas legales con abogados especializados en diferentes áreas del derecho.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                )
              },
              {
                title: "Revisión de Documentos",
                description: "Análisis y revisión de contratos, acuerdos y documentos legales por profesionales.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )
              },
              {
                title: "Representación Legal",
                description: "Representación profesional en procesos judiciales y extrajudiciales.",
                icon: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                )
              }
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100"
              >
                <div className="w-16 h-16 bg-azul-claro rounded-lg flex items-center justify-center mb-4 text-azul-primario">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-azul-primario mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <Link href="/servicios" className="text-vinotinto font-medium hover:text-vinotinto-light flex items-center gap-2">
                  Saber más
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección de Testimonios */}
      <section className="py-16 bg-azul-claro/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Lo que dicen nuestros clientes</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Testimonios de personas que han confiado en nuestros servicios.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                name: "María González",
                role: "Empresaria",
                testimonial: "El servicio fue excelente. Recibí asesoría clara y profesional para mi caso de derecho mercantil.",
                avatar: "/images/avatar-1.jpg"
              },
              {
                name: "Carlos Rodríguez",
                role: "Propietario",
                testimonial: "Gracias a VirtuAbogado pude resolver rápidamente un problema de arrendamiento que tenía pendiente.",
                avatar: "/images/avatar-2.jpg"
              },
              {
                name: "Laura Martínez",
                role: "Profesional",
                testimonial: "La plataforma es muy intuitiva y los abogados son realmente profesionales. Totalmente recomendado.",
                avatar: "/images/avatar-3.jpg"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl shadow-md"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden relative">
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-azul-primario">{testimonial.name}</h4>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 italic">"{testimonial.testimonial}"</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-vinotinto to-azul-primario text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold">¿Listo para resolver tus asuntos legales?</h2>
            <p className="text-lg text-white/80">Únete a nuestra plataforma y conecta con abogados especializados.</p>
            <div className="pt-4">
              <Link href="/registro">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white text-vinotinto font-bold rounded-xl shadow-lg hover:bg-azul-claro transition-all duration-300"
                >
                  Comenzar ahora
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
