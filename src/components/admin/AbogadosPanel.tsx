import { useState, useMemo, memo } from 'react';
import { FiBriefcase, FiSearch, FiEdit2, FiTrash2, FiMoreVertical, FiUserCheck, FiStar, FiCheck, FiX, FiFilter, FiAward, FiMapPin } from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import { Lawyer, LawyerStatus } from '@/features/lawyers/types/lawyers.types';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { ElementoSeleccionable } from '@/types/index';
import { formatLawyerName } from '@/utils/formatters';

interface AbogadosPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: ElementoSeleccionable) => void;
}

function AbogadosPanel({ terminoBusqueda, abrirModal }: AbogadosPanelProps) {
  // ============ REACT QUERY ============
  const { data: lawyers = [], isLoading } = useLawyers();
  const { data: ordersResponse } = useOrders();
  const orders = ordersResponse?.data || [];

  // Filtros locales
  const [especialidadFilter, setEspecialidadFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LawyerStatus>('ALL');

  // Obtener especialidades únicas
  const especialidades = useMemo(() => {
    const specs = new Set<string>();
    lawyers.forEach(l => specs.add(l.especialidad));
    return Array.from(specs).sort();
  }, [lawyers]);

  // Filtrar abogados
  const filteredLawyers = useMemo(() => {
    const term = terminoBusqueda.toLowerCase();

    return lawyers.filter(lawyer => {
      const matchesSearch =
        lawyer.nombre.toLowerCase().includes(term) ||
        lawyer.email.toLowerCase().includes(term) ||
        (lawyer.telefono && lawyer.telefono.includes(term));

      const matchesSpecialty = especialidadFilter === 'todas' || lawyer.especialidad === especialidadFilter;
      const matchesStatus = statusFilter === 'ALL' || lawyer.status === statusFilter;

      return matchesSearch && matchesSpecialty && matchesStatus;
    });
  }, [lawyers, terminoBusqueda, especialidadFilter, statusFilter]);

  // Casos actualmente en proceso asignados al abogado
  const getActiveCases = (lawyerId: string) => {
    return orders.filter(
      o => o.lawyerId === lawyerId && o.status === OrderStatus.EN_PROGRESO
    ).length;
  };

  // TODO: Implementar cambio de estado con mutación
  const cambiarEstadoAbogado = (id: string, status: LawyerStatus) => {
    console.log('Implement change status', id, status);
  }

  if (isLoading && lawyers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <FiSearch className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Filtros:</span>
        </div>

        <select
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario/50 text-sm"
          value={especialidadFilter}
          onChange={(e) => setEspecialidadFilter(e.target.value)}
        >
          <option value="todas">Todas las especialidades</option>
          {especialidades.map(esp => (
            <option key={esp} value={esp}>{esp}</option>
          ))}
        </select>

        <select
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario/50 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="ALL">Todos los estados</option>
          <option value={LawyerStatus.ACTIVE}>Activos</option>
          <option value={LawyerStatus.PENDING}>Pendientes</option>
          <option value={LawyerStatus.INACTIVE}>Inactivos</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Abogado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Especialidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calificación
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLawyers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron abogados con los criterios seleccionados
                  </td>
                </tr>
              ) : (
                filteredLawyers.map((lawyer) => {
                  const casosEnProceso = getActiveCases(lawyer.id);

                  return (
                    <tr key={lawyer.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            <Image
                              src={userImage}
                              alt={lawyer.nombre}
                              fill
                              className="rounded-full object-cover"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{formatLawyerName(lawyer.nombre)}</div>
                            <div className="text-xs text-gray-500">{lawyer.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                          {lawyer.especialidad}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lawyer.status === LawyerStatus.ACTIVE ? 'bg-green-100 text-green-800' :
                          lawyer.status === LawyerStatus.PENDING ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                          {lawyer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            casosEnProceso === 0
                              ? 'bg-gray-100 text-gray-500'
                              : casosEnProceso >= 8
                              ? 'bg-red-100 text-red-700'
                              : casosEnProceso >= 4
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            <FiBriefcase className="w-3 h-3" />
                            {casosEnProceso} {casosEnProceso === 1 ? 'caso' : 'casos'} en proceso
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-amber-500">
                          <span className="text-sm font-bold text-gray-700 mr-1">{lawyer.rating || 'N/A'}</span>
                          <FiStar className="fill-current w-4 h-4" />
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => abrirModal('ver', lawyer as unknown as ElementoSeleccionable)}
                            className="text-azul-primario hover:text-azul-primario/80"
                            title="Ver perfil"
                          >
                            <FiUserCheck />
                          </button>
                          <button
                            onClick={() => abrirModal('editar', lawyer as unknown as ElementoSeleccionable)}
                            className="text-amber-500 hover:text-amber-600"
                            title="Editar"
                          >
                            <FiEdit2 />
                          </button>

                          {lawyer.status === LawyerStatus.PENDING && (
                            <>
                              <button
                                onClick={() => cambiarEstadoAbogado(lawyer.id, LawyerStatus.ACTIVE)}
                                className="text-green-500 hover:text-green-600"
                                title="Aprobar"
                              >
                                <FiCheck />
                              </button>
                              <button
                                onClick={() => cambiarEstadoAbogado(lawyer.id, LawyerStatus.INACTIVE)}
                                className="text-red-500 hover:text-red-600"
                                title="Rechazar"
                              >
                                <FiX />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => abrirModal('eliminar', lawyer as unknown as ElementoSeleccionable)}
                            className="text-red-500 hover:text-red-600"
                            title="Desactivar/Eliminar"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default memo(AbogadosPanel);