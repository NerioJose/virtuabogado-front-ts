'use client';

import React from 'react';
import { motion } from 'framer-motion';

const MAP_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d507183.4768929463!2d-68.1994!3d10.1621!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e8063ac94b61481%3A0x1d1b0f4c1c1c1c1c!2sEstado%20Carabobo%2C%20Venezuela!5e0!3m2!1ses!2sve!4v1732206000000!5m2!1ses!2sve&z=9';

const SeccionMapa = React.memo(() => {
  const [showMap, setShowMap] = React.useState(false);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold text-azul-primario mb-4">
          Nuestra Ubicación
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Nos encontramos en el estado Carabobo, Venezuela. Aquí puedes ver nuestra ubicación en el mapa.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="w-full h-[300px] md:h-[450px] rounded-xl overflow-hidden shadow-lg relative bg-gradient-to-br from-azul-primario/10 to-azul-claro/20"
      >
        {showMap ? (
          <iframe
            src={MAP_URL}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa de Carabobo, Venezuela"
            className="absolute inset-0"
          />
        ) : (
          <button
            onClick={() => setShowMap(true)}
            className="absolute inset-0 w-full h-full group cursor-pointer flex items-center justify-center"
            aria-label="Cargar mapa interactivo"
          >
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-6 shadow-xl text-center group-hover:bg-white transition-colors group-hover:scale-105 duration-300">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-sm font-bold text-gray-800">Ver mapa interactivo</p>
              <p className="text-[10px] text-gray-500 mt-1">(Google Maps)</p>
            </div>
          </button>
        )}
      </motion.div>
    </div>
  );
});

SeccionMapa.displayName = 'SeccionMapa';

export default SeccionMapa;
