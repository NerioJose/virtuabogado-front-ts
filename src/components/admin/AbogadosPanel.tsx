import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiEye, FiCheck, FiX, FiFilter } from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';

interface AbogadosPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: any) => void;
}

interface Abogado {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string;
  numeroColegiado: string;
  experienciaAnios: number;
  estado: 'pendiente' | 'activo' | 'inactivo';
  casosAsignados: number;
  casosCompletados: number;
  ingresosTotales: number;
  pagosPendientes: number;
  imagen?: string;
}

export default function AbogadosPanel({ terminoBusqueda, abrirModal }: AbogadosPanelProps) {
  const [abogados, setAbogados] = useState<Abogado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'activo' | 'inactivo'>('todos');

  useEffect(() => {
    // Aquí se haría la llamada a la API para obtener los abogados
    // Por ahora usamos datos de ejemplo
    setTimeout(() => {
      setAbogados([
        {
          id: 1,
          nombre: 'Carlos Méndez',
          email: 'carlos.mendez@ejemplo.com',
          telefono: '+34 612 345 678',
          especialidad: 'Derecho Civil',
          numeroColegiado: 'AB12345',
          experienciaAnios: 8,
          estado: 'activo',
          casosAsignados: 12,
          casosCompletados: 45,
          ingresosTotales: 12500,
          pagosPendientes: 1200
        },
        {
          id: 2,
          nombre: 'María Rodríguez',
          email: 'maria.rodriguez@ejemplo.com',
          telefono: '+34 623 456 789',
          especialidad: 'Derecho Mercantil',
          numeroColegiado: 'AB23456',
          experienciaAnios: 5,
          estado: 'pendiente',
          casosAsignados: 0,
          casosCompletados: 0,
          ingresosTotales: 0,
          pagosPendientes: 0
        },
        {
          id: 3,
          nombre: 'Javier López',
          email: 'javier.lopez@ejemplo.com',
          telefono: '+34 634 567 890',
          especialidad: 'Derecho Penal',
          numeroColegiado: 'AB34567',
          experienciaAnios: 12,
          estado: 'activo',
          casosAsignados: 8,
          casosCompletados: 67,
          ingresosTotales: 18700,
          pagosPendientes: 2300
        },
        {
          id: 4,
          nombre: 'Ana Martínez',
          email: 'ana.martinez@ejemplo.com',
          telefono: '+34 645 678 901',
          especialidad: 'Derecho Laboral',
          numeroColegiado: 'AB45678',
          experienciaAnios: 7,
          estado: 'inactivo',
          casosAsignados: 0,
          casosCompletados: 23,
          ingresosTotales: 6500,
          pagosPendientes: 0
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Filtrar abogados según término de búsqueda y filtro de estado
  const abogadosFiltrados = abogados.filter(abogado => {
    const coincideTermino = 
      abogado.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      abogado.email.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      abogado.especialidad.toLowerCase().includes(terminoBusqueda.toLowerCase());
    
    const coincideEstado = filtroEstado === 'todos' || abogado.estado === filtroEstado;
    
    return coincideTermino && coincideEstado;
  });

  // Función para aprobar o rechazar abogados
  const cambiarEstadoAbogado = (id: number, nuevoEstado: 'activo' | 'inactivo') => {
    setAbogados(abogados.map(abogado => 
      abogado.id === id ? { ...abogado, estado: nuevoEstado } : abogado
    ));
  };

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
                ? 'bg-amber-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltroEstado('activo')}
            className={`px-3 py-1 rounded-full text-sm ${
              filtroEstado === 'activo' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setFiltroEstado('inactivo')}
            className={`px-3 py-1 rounded-full text-sm ${
              filtroEstado === 'inactivo' 
                ? 'bg-gray-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactivos
          </button>
        </div>
      </div>
      
      {/* Tabla de abogados */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abogado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Especialidad
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nº Colegiado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Experiencia
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Casos
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {abogadosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No se encontraron abogados con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                abogadosFiltrados.map((abogado) => (
                  <tr key={abogado.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          <Image
                            src={abogado.imagen || userImage}
                            alt={abogado.nombre}
                            fill
                            className="rounded-full object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{abogado.nombre}</div>
                          <div className="text-sm text-gray-500">{abogado.email}</div>
                          <div className="text-sm text-gray-500">{abogado.telefono}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{abogado.especialidad}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{abogado.numeroColegiado}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{abogado.experienciaAnios} años</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        abogado.estado === 'activo' ? 'bg-green-100 text-green-800' :
                        abogado.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {abogado.estado === 'activo' ? 'Activo' :
                         abogado.estado === 'pendiente' ? 'Pendiente' :
                         'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {abogado.casosAsignados} asignados
                      </div>
                      <div className="text-sm text-gray-500">
                        {abogado.casosCompletados} completados
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => abrirModal('ver', abogado)}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles"
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={() => abrirModal('editar', abogado)}
                          className="text-amber-500 hover:text-amber-600"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        {abogado.estado === 'pendiente' && (
                          <>
                            <button
                              onClick={() => cambiarEstadoAbogado(abogado.id, 'activo')}
                              className="text-green-500 hover:text-green-600"
                              title="Aprobar"
                            >
                              <FiCheck />
                            </button>
                            <button
                              onClick={() => cambiarEstadoAbogado(abogado.id, 'inactivo')}
                              className="text-red-500 hover:text-red-600"
                              title="Rechazar"
                            >
                              <FiX />
                            </button>
                          </>
                        )}
                        {abogado.estado !== 'pendiente' && (
                          <button
                            onClick={() => abrirModal('eliminar', abogado)}
                            className="text-red-500 hover:text-red-600"
                            title="Eliminar"
                          >
                            <FiTrash2 />
                          </button>
                        )}
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