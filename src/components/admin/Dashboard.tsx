import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUsers, 
  FiUserCheck, 
  FiBriefcase, 
  FiDollarSign, 
  FiAlertCircle,
  FiTrendingUp,
  FiCalendar,
  FiClock
} from 'react-icons/fi';
import { formatCurrency } from '@/utils/formatters';

// Tipos de datos
interface EstadisticasGenerales {
  total_abogados: number;
  total_clientes: number;
  total_casos: number;
  casos_activos: number;
  casos_completados: number;
  ingresos_totales: number;
  ingresos_mes_actual: number;
  crecimiento_mensual: number;
}

interface CasoReciente {
  id: number;
  titulo: string;
  cliente_nombre: string;
  abogado_nombre?: string;
  fecha: string;
  estado: 'pendiente' | 'asignado' | 'en_proceso' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta';
}

export default function Dashboard() {
  const [estadisticas, setEstadisticas] = useState<EstadisticasGenerales>({
    total_abogados: 0,
    total_clientes: 0,
    total_casos: 0,
    casos_activos: 0,
    casos_completados: 0,
    ingresos_totales: 0,
    ingresos_mes_actual: 0,
    crecimiento_mensual: 0
  });
  
  const [casosRecientes, setCasosRecientes] = useState<CasoReciente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Simulación de carga de datos
    const cargarDatos = async () => {
      try {
        // Aquí iría la llamada a la API para obtener estadísticas
        // Por ahora usamos datos de ejemplo
        setTimeout(() => {
          setEstadisticas({
            total_abogados: 24,
            total_clientes: 156,
            total_casos: 89,
            casos_activos: 42,
            casos_completados: 47,
            ingresos_totales: 15680,
            ingresos_mes_actual: 3450,
            crecimiento_mensual: 12.5
          });
          
          setCasosRecientes([
            {
              id: 1,
              titulo: 'Consulta sobre contrato laboral',
              cliente_nombre: 'María González',
              abogado_nombre: 'Carlos Rodríguez',
              fecha: '2023-06-15',
              estado: 'en_proceso',
              prioridad: 'media'
            },
            {
              id: 2,
              titulo: 'Asesoría en divorcio',
              cliente_nombre: 'Juan Pérez',
              abogado_nombre: 'Ana Martínez',
              fecha: '2023-06-14',
              estado: 'asignado',
              prioridad: 'alta'
            },
            {
              id: 3,
              titulo: 'Revisión de contrato de arrendamiento',
              cliente_nombre: 'Luis Sánchez',
              fecha: '2023-06-13',
              estado: 'pendiente',
              prioridad: 'baja'
            },
            {
              id: 4,
              titulo: 'Consulta sobre herencia',
              cliente_nombre: 'Elena Díaz',
              abogado_nombre: 'Roberto Fernández',
              fecha: '2023-06-10',
              estado: 'completado',
              prioridad: 'media'
            },
            {
              id: 5,
              titulo: 'Asesoría fiscal para autónomos',
              cliente_nombre: 'Pablo Moreno',
              fecha: '2023-06-09',
              estado: 'pendiente',
              prioridad: 'media'
            }
          ]);
          
          setIsLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error);
        setIsLoading(false);
      }
    };
    
    cargarDatos();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-azul-primario">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <FiCalendar className="text-gray-500" />
          <span className="text-gray-500">{new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Total Clientes</p>
              <h3 className="text-3xl font-bold text-azul-primario mt-2">{estadisticas.total_clientes}</h3>
            </div>
            <div className="w-12 h-12 bg-azul-claro/20 rounded-lg flex items-center justify-center text-azul-primario">
              <FiUsers size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-500 text-sm">
            <FiTrendingUp className="mr-1" />
            <span>+5.2% este mes</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Total Abogados</p>
              <h3 className="text-3xl font-bold text-azul-primario mt-2">{estadisticas.total_abogados}</h3>
            </div>
            <div className="w-12 h-12 bg-azul-claro/20 rounded-lg flex items-center justify-center text-azul-primario">
              <FiUserCheck size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-500 text-sm">
            <FiTrendingUp className="mr-1" />
            <span>+2.1% este mes</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Casos Activos</p>
              <h3 className="text-3xl font-bold text-azul-primario mt-2">{estadisticas.casos_activos}</h3>
            </div>
            <div className="w-12 h-12 bg-azul-claro/20 rounded-lg flex items-center justify-center text-azul-primario">
              <FiBriefcase size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-500">{estadisticas.casos_completados} completados</span>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-500 text-sm">Ingresos Mes Actual</p>
              <h3 className="text-3xl font-bold text-azul-primario mt-2">{formatCurrency(estadisticas.ingresos_mes_actual)}</h3>
            </div>
            <div className="w-12 h-12 bg-azul-claro/20 rounded-lg flex items-center justify-center text-azul-primario">
              <FiDollarSign size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-green-500 text-sm">
            <FiTrendingUp className="mr-1" />
            <span>+{estadisticas.crecimiento_mensual}% vs mes anterior</span>
          </div>
        </motion.div>
      </div>
      
      {/* Casos recientes */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-azul-primario">Casos Recientes</h2>
          <button className="text-sm text-azul-primario hover:underline">Ver todos</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Caso</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abogado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {casosRecientes.map((caso) => (
                <tr key={caso.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-azul-primario">{caso.titulo}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{caso.cliente_nombre}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {caso.abogado_nombre || (
                        <span className="text-amber-500 flex items-center">
                          <FiClock className="mr-1" size={14} />
                          Sin asignar
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{new Date(caso.fecha).toLocaleDateString('es-ES')}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      caso.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      caso.estado === 'asignado' ? 'bg-blue-100 text-blue-800' :
                      caso.estado === 'en_proceso' ? 'bg-indigo-100 text-indigo-800' :
                      caso.estado === 'completado' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {caso.estado === 'pendiente' ? 'Pendiente' :
                       caso.estado === 'asignado' ? 'Asignado' :
                       caso.estado === 'en_proceso' ? 'En proceso' :
                       caso.estado === 'completado' ? 'Completado' :
                       'Cancelado'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      caso.prioridad === 'baja' ? 'bg-green-100 text-green-800' :
                      caso.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {caso.prioridad === 'baja' ? 'Baja' :
                       caso.prioridad === 'media' ? 'Media' :
                       'Alta'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
      
      {/* Alertas y notificaciones */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex items-center mb-6">
          <FiAlertCircle className="text-amber-500 mr-2" size={20} />
          <h2 className="text-xl font-bold text-azul-primario">Alertas y Notificaciones</h2>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 border border-amber-200 rounded-lg bg-amber-50 flex items-start">
            <FiAlertCircle className="text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-800 font-medium">3 casos pendientes de asignación</p>
              <p className="text-amber-600 text-sm mt-1">Hay casos que requieren asignación de abogado.</p>
            </div>
          </div>
          
          <div className="p-4 border border-red-200 rounded-lg bg-red-50 flex items-start">
            <FiAlertCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">2 solicitudes de abogados pendientes de revisión</p>
              <p className="text-red-600 text-sm mt-1">Hay solicitudes de abogados que requieren aprobación.</p>
            </div>
          </div>
          
          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 flex items-start">
            <FiAlertCircle className="text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-blue-800 font-medium">5 pagos pendientes a abogados</p>
              <p className="text-blue-600 text-sm mt-1">Hay pagos pendientes que deben procesarse esta semana.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}