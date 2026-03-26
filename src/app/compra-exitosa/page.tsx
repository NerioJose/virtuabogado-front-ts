'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiCheck, FiClock, FiFileText, FiCalendar, FiArrowRight } from 'react-icons/fi';
// Las imágenes en /public se sirven desde la raíz / en Next.js. No es necesario importarlas como módulos para el componente Image.

// Tipos de datos
interface DetalleCompra {
  id: string;
  servicio: string;
  precio: number;
  fecha: string;
  metodoPago: string;
}

export default function CompraExitosaPage() {

  // Estado para los detalles de la compra (simulado, vendría de localStorage o parámetros de URL)
  const [detalleCompra] = useState<DetalleCompra>({
    id: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
    servicio: 'Consulta Legal Virtual',
    precio: 99.99,
    fecha: new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    metodoPago: 'Tarjeta de crédito'
  });

  // Simular carga de datos desde localStorage o parámetros
  useEffect(() => {
    // Aquí se podría obtener información real de la compra
    // Por ejemplo, desde localStorage o parámetros de URL

    // Ejemplo (comentado):
    // const servicioComprado = localStorage.getItem('servicioComprado');
    // if (servicioComprado) {
    //   setDetalleCompra(JSON.parse(servicioComprado));
    // }
  }, []);

  // Pasos siguientes después de la compra
  const pasosSiguientes = [
    {
      icono: <FiClock className="text-azul-primario" />,
      titulo: "Confirmación por correo electrónico",
      descripcion: "Recibirás un correo electrónico con todos los detalles de tu compra en los próximos minutos."
    },
    {
      icono: <FiFileText className="text-azul-primario" />,
      titulo: "Asignación de abogado",
      descripcion: "Nuestro equipo asignará un abogado especializado en tu caso en un plazo de 24 horas."
    },
    {
      icono: <FiCalendar className="text-azul-primario" />,
      titulo: "Programación de cita",
      descripcion: "Te contactaremos para programar la fecha y hora de tu consulta legal virtual."
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/logo/logo_sf_1.png"
              alt="VirtuAbogado Logo"
              width={180}
              height={60}
              className="mx-auto"
            />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-white shadow-lg rounded-xl overflow-hidden mb-8"
        >
          <div className="bg-green-50 p-8 text-center border-b border-green-100">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <FiCheck className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Compra realizada con éxito!</h1>
            <p className="text-gray-600">
              Gracias por confiar en VirtuAbogado. Tu servicio ha sido registrado correctamente.
            </p>
          </div>

          <div className="p-6">
            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
                Detalles de la compra
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Número de orden:</span>
                  <span className="font-medium">{detalleCompra.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicio:</span>
                  <span className="font-medium">{detalleCompra.servicio}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha:</span>
                  <span className="font-medium">{detalleCompra.fecha}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Método de pago:</span>
                  <span className="font-medium">{detalleCompra.metodoPago}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="text-gray-800 font-medium">Total pagado:</span>
                  <span className="font-bold text-azul-primario">
                    {detalleCompra.precio.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
                Próximos pasos
              </h2>

              <div className="space-y-4">
                {pasosSiguientes.map((paso, index) => (
                  <div key={index} className="flex">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-azul-claro/30 flex items-center justify-center mr-4">
                      {paso.icono}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{paso.titulo}</h3>
                      <p className="text-sm text-gray-600">{paso.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-gray-600 italic">
                Si tienes alguna pregunta sobre tu compra, no dudes en contactar con nuestro equipo de soporte a través del correo electrónico <span className="font-medium">soporte@virtuabogado.com</span> o llamando al <span className="font-medium">900 123 456</span>.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/mis-servicios">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary flex items-center justify-center"
            >
              Ver mis servicios <FiArrowRight className="ml-2" />
            </motion.button>
          </Link>
          <Link href="/">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-white text-azul-primario border border-azul-primario rounded-xl hover:bg-azul-claro transition-all duration-300"
            >
              Volver al inicio
            </motion.button>
          </Link>
        </div>
      </div>
    </main>
  );
}