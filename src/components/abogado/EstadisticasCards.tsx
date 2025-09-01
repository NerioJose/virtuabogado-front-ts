import { motion } from 'framer-motion';
import {
  FiBriefcase,
  FiCalendar,
  FiClock,
  FiUser,
  FiDollarSign,
  FiCheckCircle,
} from 'react-icons/fi';
import { Estadisticas } from '@/types';

interface EstadisticasCardsProps {
  estadisticas: Estadisticas;
}

export default function EstadisticasCards({ estadisticas }: EstadisticasCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm">Casos Activos</p>
            <h3 className="text-3xl font-bold text-azul-primario mt-2">
              {estadisticas.casosActivos}
            </h3>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
            <FiBriefcase size={24} />
          </div>
        </div>
        <div className="mt-4 flex items-center text-amber-500 text-sm">
          <FiClock className="mr-1" />
          <span>{estadisticas.casosPendientes} pendientes de revisión</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm">Próxima Cita</p>
            <h3 className="text-xl font-bold text-azul-primario mt-2">
              {new Date(estadisticas.proximaCita).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </h3>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
            <FiCalendar size={24} />
          </div>
        </div>
        <div className="mt-4 flex items-center text-gray-500 text-sm">
          <FiUser className="mr-1" />
          <span>{estadisticas.clientesActivos} clientes activos</span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-gray-500 text-sm">Ingresos del Mes</p>
            <h3 className="text-3xl font-bold text-azul-primario mt-2">
              {estadisticas.ingresosMes}€
            </h3>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
            <FiDollarSign size={24} />
          </div>
        </div>
        <div className="mt-4 flex items-center text-green-500 text-sm">
          <FiCheckCircle className="mr-1" />
          <span>{estadisticas.casosCompletados} casos completados</span>
        </div>
      </motion.div>
    </div>
  );
}