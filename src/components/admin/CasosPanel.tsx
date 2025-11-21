import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiEye, FiFilter, FiUserCheck, FiClock } from 'react-icons/fi';
import { ElementoSeleccionable, Caso } from '@/types/index';

interface CasosPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: ElementoSeleccionable) => void;
}

// Extendemos la interfaz Caso para incluir campos específicos del panel de administración
interface CasoAdmin extends Omit<Caso, 'abogado' | 'estado'> {
  abogado?: string; // Opcional para casos pendientes
  fechaAsignacion?: string;
  estado: 'pendiente' | 'asignado' | 'en_proceso' | 'completado' | 'cancelado';
  tipo: string;
  descripcion: string;
}

export default function CasosPanel({ terminoBusqueda, abrirModal }: CasosPanelProps) {
  const [casos, setCasos] = useState<CasoAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'asignado' | 'en_proceso' | 'completado' | 'cancelado'>('todos');

  // Función para convertir CasoAdmin a Caso
  const convertirACaso = (casoAdmin: CasoAdmin): Caso => {
    return {
      id: casoAdmin.id,
      titulo: casoAdmin.titulo,
      cliente: casoAdmin.cliente,
      abogado: casoAdmin.abogado || 'Sin asignar',
      estado: casoAdmin.estado === 'asignado' || casoAdmin.estado === 'en_proceso' ? 'en_progreso' : 
              casoAdmin.estado === 'completado' ? 'completado' : 
              casoAdmin.estado === 'cancelado' ? 'cancelado' : 'pendiente',
      fechaCreacion: casoAdmin.fechaCreacion,
      prioridad: casoAdmin.prioridad,
      descripcion: casoAdmin.descripcion
    };
  };

  useEffect(() => {
    // Aquí se haría la llamada a la API para obtener los casos
    // Por ahora usamos datos de ejemplo
    setTimeout(() => {
      setCasos([
        {
          id: 1,
          titulo: 'Consulta sobre contrato laboral',
          cliente: 'María González',
          abogado: 'Carlos Rodríguez',
          fechaCreacion: '2023-06-15',
          fechaAsignacion: '2023-06-16',
          estado: 'en_proceso',
          prioridad: 'media',
          tipo: 'Derecho Laboral',
          descripcion: 'Consulta sobre cláusulas abusivas en contrato laboral y posibles acciones legales.'
        },
        {
          id: 2,
          titulo: 'Asesoría en divorcio',
          cliente: 'Juan Pérez',
          abogado: 'Ana Martínez',
          fechaCreacion: '2023-06-14',
          fechaAsignacion: '2023-06-14',
          estado: 'asignado',
          prioridad: 'alta',
          tipo: 'Derecho de Familia',
          descripcion: 'Asesoramiento sobre proceso de divorcio de mutuo acuerdo y custodia compartida.'
        },
        {
          id: 3,
          titulo: 'Revisión de contrato de arrendamiento',
          cliente: 'Luis Sánchez',
          fechaCreacion: '2023-06-13',
          estado: 'pendiente',
          prioridad: 'baja',
          tipo: 'Derecho Civil',
          descripcion: 'Revisión de contrato de arrendamiento de local comercial para verificar condiciones.'
        },
        {
          id: 4,
          titulo: 'Consulta sobre herencia',
          cliente: 'Elena Díaz',
          abogado: 'Roberto Fernández',
          fechaCreacion: '2023-06-10',
          fechaAsignacion: '2023-06-11',
          estado: 'completado',
          prioridad: 'media',
          tipo: 'Derecho Civil',
          descripcion: 'Consulta sobre reparto de herencia y proceso de testamentaría.'
        },
        {
          id: 5,
          titulo: 'Asesoría fiscal para autónomos',
          cliente: 'Pablo Moreno',
          fechaCreacion: '2023-06-09',
          estado: 'pendiente',
          prioridad: 'media',
          tipo: 'Derecho Fiscal',
          descripcion: 'Asesoramiento sobre obligaciones fiscales para autónomos y posibles deducciones.'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Filtrar casos según término de búsqueda y filtro de estado
  const casosFiltrados = casos.filter(caso => {
    const coincideTermino = 
      caso.titulo.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      caso.cliente.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      (caso.abogado && caso.abogado.toLowerCase().includes(terminoBusqueda.toLowerCase())) ||
      caso.tipo.toLowerCase().includes(terminoBusqueda.toLowerCase());
    
    const coincideEstado = filtroEstado === 'todos' || caso.estado === filtroEstado;
    
    return coincideTermino && coincideEstado;
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
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center">
          <FiFilter className="text-gray-500 mr-2" />
          <span className="text-gray-700 font-medium">Filtrar por estado:</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
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
            onClick={() => setFiltroEstado('asignado')}
            className={`px-3 py-1 rounded-full text-sm ${
              filtroEstado === 'asignado' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Asignados
          </button>
          <button
            onClick={() => setFiltroEstado('en_proceso')}
            className={`px-3 py-1 rounded-full text-sm ${
              filtroEstado === 'en_proceso' 
                ? 'bg-indigo-500 text-white' 
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
      
      {/* Tabla de casos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
                  Abogado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
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
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    No se encontraron casos con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                casosFiltrados.map((caso) => (
                  <tr key={caso.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-azul-primario">{caso.titulo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{caso.cliente}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {caso.abogado || (
                          <div className="flex items-center text-amber-500">
                            <FiClock className="mr-1" size={14} />
                            <span>Sin asignar</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{caso.tipo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{new Date(caso.fechaCreacion).toLocaleDateString('es-ES')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => abrirModal('ver', convertirACaso(caso))}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles"
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={() => abrirModal('editar', convertirACaso(caso))}
                          className="text-amber-500 hover:text-amber-600"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        {caso.estado === 'pendiente' && (
                          <button
                            onClick={() => abrirModal('asignar', convertirACaso(caso))}
                            className="text-blue-500 hover:text-blue-600"
                            title="Asignar abogado"
                          >
                            <FiUserCheck />
                          </button>
                        )}
                        <button
                          onClick={() => abrirModal('eliminar', convertirACaso(caso))}
                          className="text-red-500 hover:text-red-600"
                          title="Eliminar"
                        >
                          <FiTrash2 />
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
    </div>
  );
}