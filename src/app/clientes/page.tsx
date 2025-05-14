'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

export default function ClientesPage() {
  // Datos de testimonios de clientes
  const testimonios = [
    {
      id: 1,
      nombre: "Ana Martínez",
      empresa: "Emprendimientos Digitales S.A.",
      testimonio: "VirtuAbogado transformó la manera en que manejamos nuestros asuntos legales. Su asesoría en derecho mercantil fue fundamental para el crecimiento de nuestra startup.",
      imagen: "/images/avatar-1.jpg"
    },
    {
      id: 2,
      nombre: "Roberto Sánchez",
      empresa: "Inmobiliaria Horizonte",
      testimonio: "Gracias al equipo de VirtuAbogado pudimos resolver complejos problemas de contratos inmobiliarios de manera eficiente y profesional.",
      imagen: "/images/avatar-2.jpg"
    },
    {
      id: 3,
      nombre: "Carolina Jiménez",
      empresa: "Consultora Innovación",
      testimonio: "La asesoría en propiedad intelectual que recibimos fue excepcional. Protegieron nuestras innovaciones con un servicio personalizado y de alta calidad.",
      imagen: "/images/avatar-3.jpg"
    },
    {
      id: 4,
      nombre: "Miguel Ángel Torres",
      empresa: "Restaurantes Unidos",
      testimonio: "Como pequeño empresario, encontrar asesoría legal accesible y de calidad era un desafío hasta que conocí VirtuAbogado. Su plataforma es justo lo que necesitábamos.",
      imagen: "/images/avatar-4.jpg"
    }
  ];

  // Datos de casos de éxito
  const casosExito = [
    {
      id: 1,
      titulo: "Resolución de conflicto empresarial",
      descripcion: "Ayudamos a una empresa tecnológica a resolver un complejo conflicto con un proveedor internacional, evitando un costoso litigio y preservando la relación comercial.",
      resultado: "Acuerdo extrajudicial favorable",
      imagen: "/images/caso-exito-1.jpg"
    },
    {
      id: 2,
      titulo: "Protección de propiedad intelectual",
      descripcion: "Asesoramos a un grupo de desarrolladores en el registro y protección de su software innovador, asegurando sus derechos ante posibles infracciones.",
      resultado: "Registro exitoso de patente",
      imagen: "/images/caso-exito-2.jpg"
    },
    {
      id: 3,
      titulo: "Reestructuración empresarial",
      descripcion: "Guiamos a una empresa familiar en su proceso de reestructuración, optimizando su estructura legal y fiscal para facilitar su crecimiento.",
      resultado: "Reducción de carga fiscal en un 30%",
      imagen: "/images/caso-exito-3.jpg"
    }
  ];

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-azul-claro/30 to-white">
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-azul-primario leading-tight mb-6">
              Nuestros <span className="text-vinotinto">Clientes</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-700">
              Conoce las historias de éxito y experiencias de quienes han confiado en nuestros servicios legales.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Testimonios Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Testimonios</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Lo que nuestros clientes dicen sobre nuestros servicios legales.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {testimonios.map((testimonio, index) => (
              <motion.div
                key={testimonio.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden relative flex-shrink-0">
                    <Image
                      src={testimonio.imagen}
                      alt={testimonio.nombre}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-azul-primario">{testimonio.nombre}</h3>
                    <p className="text-sm text-vinotinto mb-2">{testimonio.empresa}</p>
                    <p className="text-gray-600 italic">"{testimonio.testimonio}"</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Casos de Éxito */}
      <section className="py-16 bg-azul-claro/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Casos de Éxito</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Algunos ejemplos de cómo hemos ayudado a nuestros clientes a resolver sus desafíos legales.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {casosExito.map((caso, index) => (
              <motion.div
                key={caso.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="glass-card overflow-hidden"
              >
                <div className="relative h-48 w-full">
                  <Image
                    src={caso.imagen}
                    alt={caso.titulo}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-azul-primario/80 to-transparent"></div>
                  <div className="absolute bottom-0 left-0 p-4 text-white">
                    <h3 className="text-xl font-bold">{caso.titulo}</h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{caso.descripcion}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-vinotinto flex-shrink-0"></div>
                    <p className="font-medium text-azul-primario">{caso.resultado}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Empresas que confían en nosotros */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Empresas que Confían en Nosotros</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Organizaciones de diversos sectores que han elegido nuestros servicios legales.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
            {[1, 2, 3, 4, 5, 6].map((logo) => (
              <motion.div
                key={logo}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="flex items-center justify-center p-4"
              >
                <div className="relative h-16 w-full opacity-70 hover:opacity-100 transition-opacity">
                  <Image
                    src={`/images/logo-empresa-${logo}.png`}
                    alt={`Logo empresa ${logo}`}
                    fill
                    className="object-contain"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-azul-claro/30">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="glass-card p-10 text-center max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-azul-primario mb-6">¿Listo para ser nuestro próximo caso de éxito?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Únete a nuestra lista de clientes satisfechos y descubre cómo podemos ayudarte con tus necesidades legales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                >
                  Contáctanos ahora
                </motion.button>
              </Link>
              <Link href="/servicios">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-white text-azul-primario border border-azul-primario rounded-xl hover:bg-azul-claro transition-all duration-300"
                >
                  Ver nuestros servicios
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}