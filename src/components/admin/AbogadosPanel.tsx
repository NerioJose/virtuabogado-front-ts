/**
 * Panel de Abogados - Conectado a lawyersStore
 * Muestra y gestiona abogados en tiempo real
 */

import { memo, useMemo } from 'react';
import { FiEdit, FiTrash2, FiEye, FiCheck, FiX, FiFilter } from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';
import { ElementoSeleccionable } from '@/types/index';
import { useLawyersStore, LawyerStatus } from '@/features/lawyers';
import { useState } from 'react';

interface AbogadosPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: ElementoSeleccionable) => void;
}

function AbogadosPanel({ terminoBusqueda, abrirModal }: AbogadosPanelProps) {
  // ============ ZUSTAND STORE ============
  const lawyers = useLawyersStore((state) => state.lawyers);
  const updateLawyer = useLawyersStore((state) => state.updateLawyer);

  const [filtroEstado, setFiltroEstado] = useState<'todos' | LawyerStatus>('todos');

  // Filtrar abogados según término de búsqueda y filtro de estado
  const abogadosFiltrados = useMemo(() => {
    return lawyers.filter(abogado => {
      const coincideTermino =
        abogado.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        abogado.email.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
        abogado.especialidad.toLowerCase().includes(terminoBusqueda.toLowerCase());

      const coincideEstado = filtroEstado === 'todos' || abogado.status === filtroEstado;

      return coincideTermino && coincideEstado;
    });
  }, [lawyers, terminoBusqueda, filtroEstado]);

  // Función para aprobar o rechazar abogados
  const cambiarEstadoAbogado = (id: number, nuevoEstado: LawyerStatus) => {
    updateLawyer(id, { status: nuevoEstado });
  };

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
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === 'todos'
              ? 'bg-azul-primario text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroEstado(LawyerStatus.PENDING)}
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === LawyerStatus.PENDING
              ? 'bg-amber-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFiltroEstado(LawyerStatus.ACTIVE)}
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === LawyerStatus.ACTIVE
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Activos
          </button>
          <button
            onClick={() => setFiltroEstado(LawyerStatus.INACTIVE)}
            className={`px-3 py-1 rounded-full text-sm ${filtroEstado === LawyerStatus.INACTIVE
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
                  Matrícula
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
                    {lawyers.length === 0
                      ? 'No hay abogados registrados'
                      : 'No se encontraron abogados con los criterios de búsqueda'}
                  </td>
                </tr>
              ) : (
                abogadosFiltrados.map((abogado) => (
                  <tr key={abogado.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          <Image
                            src={userImage}
                            alt={abogado.nombre}
                            fill
                            className="rounded-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{abogado.nombre}</div>
                          <div className="text-sm text-gray-500">{abogado.email}</div>
                          {abogado.telefono && (
                            <div className="text-sm text-gray-500">{abogado.telefono}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{abogado.especialidad}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{abogado.matricula || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {abogado.experiencia ? `${abogado.experiencia} años` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${abogado.status === LawyerStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                        abogado.status === LawyerStatus.PENDING ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                        {abogado.status === LawyerStatus.ACTIVE ? 'Activo' :
                          abogado.status === LawyerStatus.PENDING ? 'Pendiente' :
                            'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {abogado.casosActivos} asignados
                      </div>
                      <div className="text-sm text-gray-500">
                        {abogado.casosCompletados} completados
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => abrirModal('ver', abogado as unknown as ElementoSeleccionable)}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles"
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={() => abrirModal('editar', abogado as unknown as ElementoSeleccionable)}
                          className="text-amber-500 hover:text-amber-600"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        {abogado.status === LawyerStatus.PENDING && (
                          <>
                            <button
                              onClick={() => cambiarEstadoAbogado(abogado.id, LawyerStatus.ACTIVE)}
                              className="text-green-500 hover:text-green-600"
                              title="Aprobar"
                            >
                              <FiCheck />
                            </button>
                            <button
                              onClick={() => cambiarEstadoAbogado(abogado.id, LawyerStatus.INACTIVE)}
                              className="text-red-500 hover:text-red-600"
                              title="Rechazar"
                            >
                              <FiX />
                            </button>
                          </>
                        )}
                        {abogado.status !== LawyerStatus.PENDING && (
                          <button
                            onClick={() => abrirModal('eliminar', abogado as unknown as ElementoSeleccionable)}
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

export default memo(AbogadosPanel);