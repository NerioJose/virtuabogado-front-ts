'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

export default function NosotrosPage() {
  // Datos del equipo
  const equipo = [
    {
      id: 1,
      nombre: "Carlos Rodríguez",
      cargo: "Abogado Senior",
      especialidad: "Derecho Mercantil",
      descripcion: "Con más de 15 años de experiencia en asesoría legal para empresas nacionales e internacionales.",
      imagen: "/images/abogado-1.jpg"
    },
    {
      id: 2,
      nombre: "María González",
      cargo: "Abogada",
      especialidad: "Derecho Familiar",
      descripcion: "Especialista en casos de familia, con un enfoque humano y orientado a soluciones pacíficas.",
      imagen: "/images/abogado-2.jpg"
    },
    {
      id: 3,
      nombre: "Javier Méndez",
      cargo: "Abogado",
      especialidad: "Derecho Inmobiliario",
      descripcion: "Experto en transacciones inmobiliarias y resolución de conflictos relacionados con propiedades.",
      imagen: "/images/abogado-3.jpg"
    },
    {
      id: 4,
      nombre: "Laura Sánchez",
      cargo: "Abogada",
      especialidad: "Derecho Laboral",
      descripcion: "Dedicada a la defensa de los derechos laborales con amplia experiencia en negociaciones colectivas.",
      imagen: "/images/abogado-4.jpg"
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
              Sobre <span className="text-vinotinto">Nosotros</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-700">
              Conoce quiénes somos y nuestra misión de hacer la asesoría legal accesible para todos.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Nuestra Historia */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold text-azul-primario">Nuestra Historia</h2>
              <p className="text-gray-600 leading-relaxed">
                VirtuAbogado nació en 2022 con la visión de transformar la manera en que las personas acceden a servicios legales. Fundada por un grupo de abogados con experiencia en diferentes áreas del derecho, nuestra plataforma busca eliminar las barreras tradicionales que dificultan el acceso a la asesoría legal de calidad.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Desde nuestros inicios, nos hemos comprometido con la innovación y la excelencia en el servicio, utilizando la tecnología para conectar a clientes con abogados especializados de manera eficiente y accesible.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Hoy, VirtuAbogado se ha consolidado como una plataforma líder en asesoría legal online, ayudando a miles de personas a resolver sus dudas y problemas legales desde la comodidad de su hogar u oficina.
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="relative h-[400px] w-full rounded-xl overflow-hidden shadow-lg"
            >
              <Image
                src="/images/nuestra-historia.jpg"
                alt="Nuestra Historia"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-azul-primario/20 to-transparent"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="py-16 bg-azul-claro/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Misión y Visión</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Nuestros valores fundamentales que guían nuestro trabajo diario.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="glass-card p-8"
            >
              <div className="w-16 h-16 bg-azul-claro rounded-lg flex items-center justify-center text-azul-primario mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-azul-primario mb-4">Nuestra Misión</h3>
              <p className="text-gray-600 leading-relaxed">
                Democratizar el acceso a servicios legales de calidad mediante una plataforma tecnológica que conecte a personas y empresas con abogados especializados, ofreciendo soluciones eficientes, transparentes y accesibles para todos.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="glass-card p-8"
            >
              <div className="w-16 h-16 bg-azul-claro rounded-lg flex items-center justify-center text-azul-primario mb-6">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-azul-primario mb-4">Nuestra Visión</h3>
              <p className="text-gray-600 leading-relaxed">
                Ser la plataforma líder en asesoría legal online, reconocida por su innovación, calidad de servicio y compromiso con la justicia, transformando positivamente la manera en que las personas acceden y experimentan los servicios legales en todo el país.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Nuestro Equipo */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Nuestro Equipo</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Profesionales comprometidos con la excelencia y el servicio al cliente.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {equipo.map((miembro, index) => (
              <motion.div
                key={miembro.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100"
              >
                <div className="relative h-64 w-full">
                  <Image
                    src={miembro.imagen}
                    alt={miembro.nombre}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-azul-primario">{miembro.nombre}</h3>
                  <p className="text-vinotinto font-medium">{miembro.cargo}</p>
                  <p className="text-gray-500 text-sm mb-3">{miembro.especialidad}</p>
                  <p className="text-gray-600">{miembro.descripcion}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Valores */}
      <section className="py-16 bg-azul-claro/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Nuestros Valores</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Principios que guían nuestras acciones y decisiones cada día.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                titulo: "Excelencia",
                descripcion: "Nos esforzamos por ofrecer el más alto nivel de servicio en cada interacción con nuestros clientes.",
                icono: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              },
              {
                titulo: "Integridad",
                descripcion: "Actuamos con honestidad, transparencia y ética en todas nuestras relaciones profesionales.",
                icono: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )
              },
              {
                titulo: "Innovación",
                descripcion: "Buscamos constantemente nuevas formas de mejorar nuestros servicios y la experiencia de nuestros clientes.",
                icono: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                )
              },
              {
                titulo: "Accesibilidad",
                descripcion: "Trabajamos para hacer que los servicios legales sean comprensibles y accesibles para todos.",
                icono: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )
              },
              {
                titulo: "Empatía",
                descripcion: "Entendemos las necesidades y preocupaciones de nuestros clientes, ofreciendo un trato humano y cercano.",
                icono: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )
              },
              {
                titulo: "Confidencialidad",
                descripcion: "Protegemos la privacidad y la información de nuestros clientes con los más altos estándares de seguridad.",
                icono: (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )
              }
            ].map((valor, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
              >
                <div className="w-14 h-14 bg-azul-claro rounded-lg flex items-center justify-center text-azul-primario mb-4">
                  {valor.icono}
                </div>
                <h3 className="text-xl font-bold text-azul-primario mb-3">{valor.titulo}</h3>
                <p className="text-gray-600">{valor.descripcion}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="glass-card p-10 text-center max-w-4xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-azul-primario mb-6">¿Listo para comenzar?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Únete a nuestra comunidad y descubre cómo podemos ayudarte con tus necesidades legales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contacto">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary"
                >
                  Contáctanos
                </motion.button>
              </Link>
              <Link href="/servicios">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-white text-azul-primario border border-azul-primario rounded-xl hover:bg-azul-claro transition-all duration-300"
                >
                  Ver servicios
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}