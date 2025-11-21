'use client';

import React from 'react';
import { motion } from 'framer-motion';

const SeccionMapa = React.memo(() => {
  return (
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
  );
});

SeccionMapa.displayName = 'SeccionMapa';

export default SeccionMapa;