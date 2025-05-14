'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function ContactoPage() {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    
    // Limpiar error cuando el usuario comienza a escribir
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }
    
    if (!formData.asunto.trim()) {
      newErrors.asunto = 'El asunto es requerido';
    }
    
    if (!formData.mensaje.trim()) {
      newErrors.mensaje = 'El mensaje es requerido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Aquí iría la lógica para enviar los datos al backend
      console.log('Datos del formulario:', formData);
      
      // Simulación de envío exitoso
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitSuccess(true);
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          asunto: '',
          mensaje: '',
        });
        
        // Resetear el mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setSubmitSuccess(false);
        }, 5000);
      }, 1500);
      
    } catch (error) {
      console.error('Error al enviar el formulario:', error);
      setIsSubmitting(false);
    }
  };

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
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="glass-card p-8"
            >
              <h2 className="text-2xl font-bold text-azul-primario mb-6">Envíanos un mensaje</h2>
              
              {submitSuccess && (
                <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
                  ¡Gracias por tu mensaje! Te contactaremos pronto.
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="nombre" className="block text-sm font-medium text-azul-primario mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border ${errors.nombre ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition-all duration-200`}
                    placeholder="Tu nombre"
                  />
                  {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-azul-primario mb-1">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition-all duration-200`}
                    placeholder="tu@ejemplo.com"
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
                
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-azul-primario mb-1">
                    Teléfono (opcional)
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition-all duration-200"
                    placeholder="+34 XXX XXX XXX"
                  />
                </div>
                
                <div>
                  <label htmlFor="asunto" className="block text-sm font-medium text-azul-primario mb-1">
                    Asunto *
                  </label>
                  <select
                    id="asunto"
                    name="asunto"
                    value={formData.asunto}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border ${errors.asunto ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition-all duration-200`}
                  >
                    <option value="">Selecciona un asunto</option>
                    <option value="Consulta legal">Consulta legal</option>
                    <option value="Revisión de documentos">Revisión de documentos</option>
                    <option value="Representación legal">Representación legal</option>
                    <option value="Información general">Información general</option>
                    <option value="Otro">Otro</option>
                  </select>
                  {errors.asunto && <p className="mt-1 text-sm text-red-600">{errors.asunto}</p>}
                </div>
                
                <div>
                  <label htmlFor="mensaje" className="block text-sm font-medium text-azul-primario mb-1">
                    Mensaje *
                  </label>
                  <textarea
                    id="mensaje"
                    name="mensaje"
                    rows={5}
                    value={formData.mensaje}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border ${errors.mensaje ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition-all duration-200`}
                    placeholder="Escribe tu mensaje aquí..."
                  ></textarea>
                  {errors.mensaje && <p className="mt-1 text-sm text-red-600">{errors.mensaje}</p>}
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`btn-primary w-full flex justify-center items-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      'Enviar mensaje'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
            
            {/* Información de contacto */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold text-azul-primario mb-6">Información de contacto</h2>
                <p className="text-gray-600 mb-8">
                  Si prefieres contactarnos directamente, aquí tienes nuestros datos de contacto. Estaremos encantados de atenderte.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-azul-claro rounded-full flex items-center justify-center text-azul-primario flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-azul-primario">Teléfono</h3>
                      <p className="text-gray-600">+34 XXX XXX XXX</p>
                      <p className="text-gray-500 text-sm">Lunes a Viernes, 9:00 - 18:00</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-azul-claro rounded-full flex items-center justify-center text-azul-primario flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-azul-primario">Correo electrónico</h3>
                      <p className="text-gray-600">info@virtuabogado.com</p>
                      <p className="text-gray-500 text-sm">Respondemos en 24-48 horas</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-azul-claro rounded-full flex items-center justify-center text-azul-primario flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-azul-primario">Dirección</h3>
                      <p className="text-gray-600">Calle Principal 123</p>
                      <p className="text-gray-600">28001 Madrid, España</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-12">
                <h3 className="text-xl font-bold text-azul-primario mb-4">Síguenos en redes sociales</h3>
                <div className="flex gap-4">
                  <a href="#" className="w-10 h-10 bg-azul-claro rounded-full flex items-center justify-center text-azul-primario hover:bg-azul-primario hover:text-white transition-all duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-azul-claro rounded-full flex items-center justify-center text-azul-primario hover:bg-azul-primario hover:text-white transition-all duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-azul-claro rounded-full flex items-center justify-center text-azul-primario hover:bg-azul-primario hover:text-white transition-all duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                  <a href="#" className="w-10 h-10 bg-azul-claro rounded-full flex items-center justify-center text-azul-primario hover:bg-azul-primario hover:text-white transition-all duration-300">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mapa */}
      <section className="py-16 bg-azul-claro/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Nuestra ubicación</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Visítanos en nuestra oficina central en Madrid.</p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="rounded-xl overflow-hidden shadow-lg h-[400px] relative"
          >
            {/* Aquí iría un mapa real, por ahora usamos una imagen de placeholder */}
            <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500">Mapa de ubicación</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-azul-primario mb-4">Preguntas Frecuentes</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Respuestas a las dudas más comunes sobre cómo contactarnos.</p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                pregunta: "¿Cuál es el tiempo de respuesta habitual?",
                respuesta: "Normalmente respondemos a todas las consultas en un plazo de 24-48 horas laborables. Para casos urgentes, recomendamos indicarlo en el asunto del mensaje."
              },
              {
                pregunta: "¿Puedo solicitar una consulta presencial?",
                respuesta: "Sí, aunque somos principalmente una plataforma online, también ofrecemos consultas presenciales en nuestra oficina de Madrid. Puedes solicitarla a través del formulario de contacto."
              },
              {
                pregunta: "¿Cómo puedo saber si mi mensaje ha sido recibido?",
                respuesta: "Tras enviar tu mensaje a través del formulario, recibirás una confirmación automática en tu correo electrónico. Si no la recibes, revisa tu carpeta de spam o contáctanos por teléfono."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl shadow-md border border-gray-100"
              >
                <h3 className="text-xl font-bold text-azul-primario mb-3">{item.pregunta}</h3>
                <p className="text-gray-600">{item.respuesta}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}