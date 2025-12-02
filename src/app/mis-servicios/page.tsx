'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { FiCalendar, FiClock, FiFileText, FiExternalLink, FiDownload, FiMessageSquare } from 'react-icons/fi';
import logo from '../../../public/logo/logo_sf_1.png';

// Tipos de datos
interface Servicio {
  id: string;
  nombre: string;
  descripcion: string;
  fecha: string;
  estado: 'pendiente' | 'programado' | 'completado';
  fechaCita?: string;
  abogado?: string;
  documentos?: Array<{
    nombre: string;
    fecha: string;
    url: string;
  }>;
}

export default function MisServiciosPage() {
  // Estado para los servicios del cliente (simulado, vendría de una API)
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);

  // Simular carga de datos desde una API
  useEffect(() => {
    // Aquí se haría la llamada a la API para obtener los servicios del cliente
    // Por ahora, simulamos una respuesta después de 1 segundo
    const cargarServicios = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Datos de ejemplo
        const serviciosEjemplo: Servicio[] = [
          {
            id: 'SRV-123456',
            nombre: 'Consulta Legal Virtual',
            descripcion: 'Asesoría legal personalizada con un abogado especializado a través de videoconferencia.',
            fecha: '15/05/2023',
            estado: 'programado',
            fechaCita: '20/05/2023 16:00',
            abogado: 'Dr. Carlos Rodríguez'
          },
          {
            id: 'SRV-789012',
            nombre: 'Revisión de Contrato',
            descripcion: 'Análisis y revisión de contrato de arrendamiento comercial.',
            fecha: '10/04/2023',
            estado: 'completado',
            fechaCita: '12/04/2023 10:30',
            abogado: 'Dra. Laura Martínez',
            documentos: [
              {
                nombre: 'Informe de revisión de contrato',
                fecha: '14/04/2023',
                url: '/documentos/informe-contrato.pdf'
              },
              {
                nombre: 'Contrato con anotaciones',
                fecha: '13/04/2023',
                url: '/documentos/contrato-anotado.pdf'
              }
            ]
          },
          {
            id: 'SRV-345678',
            nombre: 'Asesoría Fiscal',
            descripcion: 'Consultoría sobre obligaciones fiscales para autónomos.',
            fecha: '18/05/2023',
            estado: 'pendiente'
          }
        ];

        setServicios(serviciosEjemplo);
      } catch (error) {
        console.error('Error al cargar los servicios:', error);
      } finally {
        setCargando(false);
      }
    };

    cargarServicios();

    // Comprobar si hay un servicio recién comprado en localStorage
    const servicioComprado = localStorage.getItem('servicioComprado');
    if (servicioComprado) {
      // Añadir el servicio recién comprado a la lista
      // (en una implementación real, esto se haría a través de la API)
      try {
        const nuevoServicio = JSON.parse(servicioComprado);
        setServicios(prevServicios => [nuevoServicio, ...prevServicios]);

        // Limpiar localStorage después de usar el dato
        localStorage.removeItem('servicioComprado');
      } catch (error) {
        console.error('Error al procesar el servicio comprado:', error);
      }
    }
  }, []);

  // Función para obtener el color según el estado
  const obtenerColorEstado = (estado: Servicio['estado']) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'programado':
        return 'bg-blue-100 text-blue-800';
      case 'completado':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener el texto del estado
  const obtenerTextoEstado = (estado: Servicio['estado']) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente de programación';
      case 'programado':
        return 'Cita programada';
      case 'completado':
        return 'Servicio completado';
      default:
        return 'Estado desconocido';
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="mb-4 sm:mb-0">
            <Link href="/" className="inline-block">
              <Image
                src={logo}
                alt="VirtuAbogado Logo"
                width={150}
                height={50}
                className="mb-4"
              />
            </Link>
            <h1 className="text-3xl font-bold text-azul-primario">Mis Servicios</h1>
            <p className="text-gray-600 mt-1">
              Gestiona y consulta todos tus servicios legales contratados
            </p>
          </div>
          <Link href="/servicios">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-primary"
            >
              Contratar nuevo servicio
            </motion.button>
          </Link>
        </div>

        {cargando ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-azul-primario"></div>
          </div>
        ) : servicios.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white shadow-md rounded-xl p-8 text-center"
          >
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-azul-claro/30 mb-4">
              <FiFileText className="h-8 w-8 text-azul-primario" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No tienes servicios contratados</h2>
            <p className="text-gray-600 mb-6">
              Aún no has contratado ningún servicio legal. Explora nuestro catálogo y encuentra el servicio que necesitas.
            </p>
            <Link href="/servicios">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary"
              >
                Ver servicios disponibles
              </motion.button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {servicios.map((servicio) => (
              <motion.div
                key={servicio.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-white shadow-md rounded-xl overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${obtenerColorEstado(servicio.estado)}`}>
                        {obtenerTextoEstado(servicio.estado)}
                      </span>
                      <h2 className="text-xl font-semibold text-gray-900 mt-2">{servicio.nombre}</h2>
                    </div>
                    <div className="mt-2 sm:mt-0 text-sm text-gray-500">
                      Contratado el {servicio.fecha}
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4">{servicio.descripcion}</p>

                  {servicio.estado === 'programado' && servicio.fechaCita && (
                    <div className="flex items-center mb-4 p-3 bg-blue-50 rounded-lg">
                      <FiCalendar className="text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Cita programada para el {servicio.fechaCita}</p>
                        {servicio.abogado && (
                          <p className="text-xs text-blue-700">Con {servicio.abogado}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {servicio.estado === 'pendiente' && (
                    <div className="flex items-center mb-4 p-3 bg-yellow-50 rounded-lg">
                      <FiClock className="text-yellow-600 mr-2" />
                      <p className="text-sm text-yellow-800">
                        Te contactaremos en breve para programar tu cita
                      </p>
                    </div>
                  )}

                  {servicio.documentos && servicio.documentos.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h3 className="text-sm font-medium text-gray-900 mb-2">Documentos disponibles:</h3>
                      <ul className="space-y-2">
                        {servicio.documentos.map((documento, idx) => (
                          <li key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <FiFileText className="text-gray-400 mr-2" />
                              <span>{documento.nombre}</span>
                              <span className="text-xs text-gray-500 ml-2">({documento.fecha})</span>
                            </div>
                            <Link href={documento.url} target="_blank" className="text-azul-primario hover:text-azul-primario/80 flex items-center">
                              <FiDownload className="mr-1" />
                              <span>Descargar</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {servicio.estado === 'programado' && (
                      <Link href={`/videollamada/${servicio.id}`}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-azul-primario hover:bg-azul-primario/90"
                        >
                          <FiExternalLink className="mr-2" />
                          Acceder a la videollamada
                        </motion.button>
                      </Link>
                    )}

                    <Link href={`/chat/${servicio.id}`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-4 py-2 border border-azul-primario text-sm font-medium rounded-md text-azul-primario bg-white hover:bg-azul-claro/10"
                      >
                        <FiMessageSquare className="mr-2" />
                        Chat con abogado
                      </motion.button>
                    </Link>

                    <Link href={`/detalle-servicio/${servicio.id}`}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Ver detalles
                      </motion.button>
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}