'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

const SeccionFAQ = React.memo(() => {
  const faqData = useMemo(() => [
    {
      pregunta: "¿Cuánto tiempo toma una consulta legal?",
      respuesta: "Una consulta inicial típicamente dura entre 30 a 60 minutos, dependiendo de la complejidad del caso. Durante este tiempo, evaluamos tu situación y te proporcionamos una orientación inicial."
    },
    {
      pregunta: "¿Ofrecen consultas gratuitas?",
      respuesta: "Sí, ofrecemos una consulta inicial gratuita de 15 minutos para evaluar tu caso y determinar cómo podemos ayudarte. Esto nos permite entender tus necesidades antes de proceder."
    },
    {
      pregunta: "¿En qué áreas del derecho se especializan?",
      respuesta: "Nos especializamos en derecho civil, mercantil, laboral y familiar. Nuestro equipo tiene amplia experiencia en contratos, disputas comerciales, asuntos laborales y procedimientos familiares."
    },
    {
      pregunta: "¿Cómo funcionan los honorarios?",
      respuesta: "Nuestros honorarios varían según el tipo de servicio y la complejidad del caso. Ofrecemos tarifas transparentes y te proporcionaremos un presupuesto detallado antes de comenzar cualquier trabajo."
    }
  ], []);

  const headerAnimation = useMemo(() => ({
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    transition: { duration: 0.6 },
    viewport: { once: true }
  }), []);

  return (
    <>
      <motion.div
        {...headerAnimation}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold text-azul-primario mb-4">Preguntas frecuentes</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Aquí encontrarás respuestas a las preguntas más comunes sobre nuestros servicios legales.
        </p>
      </motion.div>
      
      <div className="max-w-3xl mx-auto">
        <div className="space-y-6">
          {faqData.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="glass-card p-6"
            >
              <h3 className="text-lg font-semibold text-azul-primario mb-3">{item.pregunta}</h3>
              <p className="text-gray-600">{item.respuesta}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
});

SeccionFAQ.displayName = 'SeccionFAQ';

export default SeccionFAQ;