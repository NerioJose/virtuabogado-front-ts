'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMapPin } from 'react-icons/fi';

const SeccionMapa = React.memo(() => {
  const [mapLoaded, setMapLoaded] = useState(false);

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
        className="w-full h-[450px] rounded-xl overflow-hidden shadow-lg relative bg-gray-100 flex items-center justify-center group"
      >
        {!mapLoaded ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 backdrop-blur-sm z-10 transition-colors">
            <div className="bg-white p-6 rounded-full shadow-md mb-4 text-azul-primario group-hover:scale-110 group-hover:bg-azul-primario group-hover:text-white transition-all duration-300 cursor-pointer" onClick={() => setMapLoaded(true)}>
              <FiMapPin className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Visítanos en Carabobo</h3>
            <button
              onClick={() => setMapLoaded(true)}
              className="btn-primary mt-2 shadow-lg"
            >
              Cargar Mapa Interactivo
            </button>
            <p className="text-xs text-gray-500 mt-4">(Al hacer clic aceptarás cargar contenido de Google Maps)</p>
          </div>
        ) : (
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d507183.4768929463!2d-68.1994!3d10.1621!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e8063ac94b61481%3A0x1d1b0f4c1c1c1c1c!2sEstado%20Carabobo%2C%20Venezuela!5e0!3m2!1ses!2sve!4v1732206000000!5m2!1ses!2sve&z=9"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa de Carabobo, Venezuela"
            className="absolute inset-0"
          />
        )}
      </motion.div>
    </div>
  );
});

SeccionMapa.displayName = 'SeccionMapa';

export default SeccionMapa;