import { useState, useEffect } from 'react';
import { FiEye, FiMessageSquare, FiFileText, FiFilter } from 'react-icons/fi';

interface CasosAbogadoPanelProps {
  abogadoId: number;
}

interface Caso {
  id: number;
  titulo: string;
  cliente: string;
  fechaAsignacion: string;
  fechaLimite?: string;
  estado: 'pendiente' | 'en_proceso' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta';
  tipo: string;
}

export default function CasosAbogadoPanel({ abogadoId }: CasosAbogadoPanelProps) {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'>('todos');

  useEffect(() => {
    // Simulación de carga de datos
    const cargarCasos = async () => {
      try {
        // Aquí iría la llamada a la API para obtener los casos del abogado
        // Por ahora, simulamos una respuesta después de 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Datos de ejemplo
        setCasos([
          {
            id: 1,
            titulo: 'Consulta sobre contrato laboral',
            cliente: 'María González',
            fechaAsignacion: '2023-06-16',
            fechaLimite: '2023-06-23',
            estado: 'en_proceso',
            prioridad: 'media',
            tipo: 'Derecho Laboral'
          },
          {
            id: 2,
            titulo: 'Asesoría en divorcio',
            cliente: 'Juan Pérez',
            fechaAsignacion: '2023-06-14',
            fechaLimite: '2023-06-28',
            estado: 'pendiente',
            prioridad: 'alta',
            tipo: 'Derecho de Familia'
          },
          {
            id: 3,
            titulo: 'Consulta sobre herencia',
            cliente: 'Elena Díaz',
            fechaAsignacion: '2023-06-11',
            fechaLimite: '2023-06-18',
            estado: 'completado',
            prioridad: 'media',
            tipo: 'Derecho Civil'
          },
          {
            id: 4,
            titulo: 'Revisión de contrato mercantil',
            cliente: 'Roberto Fernández',
            fechaAsignacion: '2023-06-10',
            fechaLimite: '2023-06-17',
            estado: 'en_proceso',
            prioridad: 'alta',
            tipo: 'Derecho Mercantil'
          },
          {
            id: 5,
            titulo: 'Consulta sobre despido improcedente',
            cliente: 'Laura Martínez',
            fechaAsignacion: '2023-06-05',
            fechaLimite: '2023-06-12',
            estado: 'completado',
            prioridad: 'media',
            tipo: 'Derecho Laboral'
          }
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar casos:', error);
        setLoading(false);
      }
    };
    
    cargarCasos();
  }, [abogadoId]);

  // Filtrar casos según filtro de estado
  const casosFiltrados = casos.filter(caso => {
    return filtroEstado === 'todos' || caso.estado === filtroEstado;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Mis Casos</h2>
        
        {/* Filtros */}
        <div className="flex items-center gap-2">
          <FiFilter className="text-gray-500" />
          <div className="flex gap-2">
            <button
              onClick={() => setFiltroEstado('todos')}
              className={`px-3 py-1 rounded-full text-sm ${
                filtroEstado === 'todos' 
                  ? 'bg-azul-primario text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroEstado('pendiente')}
              className={`px-3 py-1 rounded-full text-sm ${
                filtroEstado === 'pendiente' 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFiltroEstado('en_proceso')}
              className={`px-3 py-1 rounded-full text-sm ${
                filtroEstado === 'en_proceso' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              En proceso
            </button>
            <button
              onClick={() => setFiltroEstado('completado')}
              className={`px-3 py-1 rounded-full text-sm ${
                filtroEstado === 'completado' 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completados
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabla de casos */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Caso
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha Límite
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Estado
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Prioridad
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {casosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  No se encontraron casos con los criterios seleccionados.
                </td>
              </tr>
            ) : (
              casosFiltrados.map((caso) => (
                <tr key={caso.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-azul-primario">{caso.titulo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{caso.cliente}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{caso.tipo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {caso.fechaLimite ? new Date(caso.fechaLimite).toLocaleDateString('es-ES') : 'No definida'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      caso.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      caso.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800' :
                      caso.estado === 'completado' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {caso.estado === 'pendiente' ? 'Pendiente' :
                       caso.estado === 'en_proceso' ? 'En proceso' :
                       caso.estado === 'completado' ? 'Completado' :
                       'Cancelado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        className="text-azul-primario hover:text-azul-primario/80"
                        title="Ver detalles"
                      >
                        <FiEye />
                      </button>
                      <button
                        className="text-green-500 hover:text-green-600"
                        title="Enviar mensaje"
                      >
                        <FiMessageSquare />
                      </button>
                      <button
                        className="text-amber-500 hover:text-amber-600"
                        title="Ver documentos"
                      >
                        <FiFileText />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}