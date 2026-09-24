'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FiMapPin } from 'react-icons/fi';

const MAP_URL = 'https://maps.google.com/maps?q=lima%2C%20peru&t=&z=11&ie=UTF8&iwloc=&output=embed';

const SeccionMapa = React.memo(() => {
  const [mapLoaded, setMapLoaded] = React.useState(false);

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
          Nos encontramos en Lima, Perú. Aquí puedes ver nuestra ubicación en el mapa.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="w-full h-[300px] md:h-[450px] rounded-xl overflow-hidden shadow-lg relative bg-gradient-to-br from-azul-primario/10 to-azul-claro/20 flex items-center justify-center group"
      >
        {!mapLoaded ? (
          <div className="flex flex-col items-center justify-center z-10">
            <div
              onClick={() => setMapLoaded(true)}
              className="bg-white p-6 rounded-full shadow-md mb-4 text-azul-primario group-hover:scale-110 group-hover:bg-azul-primario group-hover:text-white transition duration-300 cursor-pointer"
            >
              <FiMapPin className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Visítanos en Lima</h3>
            <button type="button"
              onClick={() => setMapLoaded(true)}
              className="bg-vinotinto hover:bg-vinotinto-light text-white font-medium py-3 px-6 rounded-xl transition duration-300 shadow-lg mt-2"
            >
              Cargar Mapa Interactivo
            </button>
            <p className="text-xs text-gray-500 mt-4">(Al hacer clic aceptarás cargar contenido de Google Maps)</p>
          </div>
        ) : (
          <iframe
            src={MAP_URL}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa de Lima, Perú"
            className="absolute inset-0"
            sandbox="allow-scripts allow-same-origin"
          />
        )}
      </motion.div>
    </div>
  );
});

SeccionMapa.displayName = 'SeccionMapa';

export default SeccionMapa;
