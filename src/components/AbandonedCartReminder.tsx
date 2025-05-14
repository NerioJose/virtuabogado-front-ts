'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { FiShoppingCart, FiX, FiArrowRight } from 'react-icons/fi';
import { checkAbandonedCart, markCartAsRecovered, clearCartData } from '../utils/cartRecovery';

export default function AbandonedCartReminder() {
  const [abandonedService, setAbandonedService] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Comprobar si hay un carrito abandonado después de que la página se cargue completamente
    const timer = setTimeout(() => {
      const service = checkAbandonedCart();
      if (service) {
        setAbandonedService(service);
        setIsVisible(true);
      }
    }, 3000); // Mostrar después de 3 segundos para no interrumpir la carga inicial
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleClose = () => {
    setIsVisible(false);
    clearCartData();
  };
  
  const handleContinue = () => {
    setIsVisible(false);
    markCartAsRecovered();
  };
  
  if (!abandonedService) return null;
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-50 max-w-md"
        >
          <div className="bg-white rounded-lg shadow-xl overflow-hidden border border-azul-claro">
            <div className="bg-azul-primario text-white px-4 py-3 flex justify-between items-center">
              <div className="flex items-center">
                <FiShoppingCart className="mr-2" />
                <h3 className="font-medium">¿Deseas continuar con tu compra?</h3>
              </div>
              <button 
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <FiX />
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-gray-600 mb-3">
                Notamos que estabas interesado en el servicio:
              </p>
              <div className="bg-gray-50 p-3 rounded-md mb-4">
                <h4 className="font-medium text-azul-primario">{abandonedService.nombre}</h4>
                <p className="text-sm text-gray-600 mt-1">{abandonedService.descripcion}</p>
                <p className="text-azul-primario font-medium mt-2">
                  {typeof abandonedService.precio === 'number' 
                    ? abandonedService.precio.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
                    : abandonedService.precio}
                </p>
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={handleClose}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  No, gracias
                </button>
                <Link href="/resumen-compra">
                  <button
                    onClick={handleContinue}
                    className="bg-azul-primario text-white px-4 py-2 rounded-md hover:bg-azul-primario/90 transition-colors flex items-center"
                  >
                    Continuar compra <FiArrowRight className="ml-2" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}