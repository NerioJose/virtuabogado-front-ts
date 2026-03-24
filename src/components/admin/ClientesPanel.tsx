import { useState, useMemo, memo } from 'react';
import { FiUsers, FiSearch, FiEdit, FiTrash2, FiEye, FiMoreVertical, FiMail, FiPhone, FiFilter } from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';
import { useClients } from '@/features/clients/hooks/useClients';
import { ClientStatus } from '@/features/clients/types/clients.types';
import { useOrdersStore } from '@/features/orders';
import { ElementoSeleccionable } from '@/types/index';

import { capitalizeName } from '@/utils/formatters';

interface ClientesPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: ElementoSeleccionable) => void;
}

function ClientesPanel({ terminoBusqueda, abrirModal }: ClientesPanelProps) {
  // ============ REACT QUERY ============
  const { data: clients = [], isLoading, error } = useClients();
  const orders = useOrdersStore((state) => state.orders); // Keep using orders store for now until that is refactored globally or locally

  const [filtroActividad, setFiltroActividad] = useState<'todos' | 'reciente' | 'inactivo'>('todos');

  // Calcular si un cliente ha estado activo recientemente (últimos 30 días)
  const esClienteReciente = (createdAt: Date | string) => {
    const hoy = new Date();
    const fechaRegistro = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const diferenciaDias = Math.floor((hoy.getTime() - fechaRegistro.getTime()) / (1000 * 60 * 60 * 24));
    return diferenciaDias <= 30;
  };

  // Filtrar clientes según término de búsqueda y filtro de actividad
  const clientesFiltrados = useMemo(() => {
    const term = terminoBusqueda.toLowerCase();

    return clients.filter(cliente => {
      const coincideTermino =
        cliente.nombre.toLowerCase().includes(term) ||
        cliente.email.toLowerCase().includes(term) ||
        (cliente.telefono && cliente.telefono.includes(term));

      if (filtroActividad === 'todos') return coincideTermino;
      if (filtroActividad === 'reciente') return coincideTermino && esClienteReciente(cliente.createdAt);
      if (filtroActividad === 'inactivo') return coincideTermino && !esClienteReciente(cliente.createdAt);

      return coincideTermino;
    });
  }, [clients, terminoBusqueda, filtroActividad]);

  // Obtener órdenes del cliente
  const getClientOrders = (clientId: string) => {
    return orders.filter(order => order.userId === clientId);
  };

  if (isLoading && clients.length === 0) {
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
          <span className="text-gray-700 font-medium">Filtrar por actividad:</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroActividad('todos')}
            className={`px-3 py-1 rounded-full text-sm ${filtroActividad === 'todos'
              ? 'bg-azul-primario text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroActividad('reciente')}
            className={`px-3 py-1 rounded-full text-sm ${filtroActividad === 'reciente'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Activos recientemente
          </button>
          <button
            onClick={() => setFiltroActividad('inactivo')}
            className={`px-3 py-1 rounded-full text-sm ${filtroActividad === 'inactivo'
              ? 'bg-gray-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Inactivos
          </button>
        </div>
      </div>

      {/* Tabla de clientes */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registro
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicios
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gasto Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {clients.length === 0
                      ? 'No hay clientes registrados'
                      : 'No se encontraron clientes con los criterios de búsqueda'}
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => {
                  const clientOrders = getClientOrders(cliente.id);

                  return (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 relative">
                            <Image
                              src={userImage}
                              alt={cliente.nombre}
                              fill
                              className="rounded-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{capitalizeName(cliente.nombre)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 flex items-center">
                          <FiMail className="mr-1" /> {cliente.email}
                        </div>
                        {cliente.telefono && (
                          <div className="text-sm text-gray-500 flex items-center">
                            <FiPhone className="mr-1" /> {cliente.telefono}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(cliente.createdAt).toLocaleDateString('es-ES')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {cliente.serviciosContratados} contratados
                        </div>
                        <div className="text-sm text-gray-500">
                          {clientOrders.length} órdenes
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ${cliente.totalGastado.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cliente.status === ClientStatus.ACTIVE
                          ? 'bg-green-100 text-green-800'
                          : cliente.status === ClientStatus.PENDING
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                          }`}>
                          {cliente.status === ClientStatus.ACTIVE ? 'Activo' :
                            cliente.status === ClientStatus.PENDING ? 'Pendiente' :
                              'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => abrirModal('ver', cliente as unknown as ElementoSeleccionable)}
                            className="text-azul-primario hover:text-azul-primario/80"
                            title="Ver detalles"
                          >
                            <FiEye />
                          </button>
                          <button
                            onClick={() => abrirModal('editar', cliente as unknown as ElementoSeleccionable)}
                            className="text-amber-500 hover:text-amber-600"
                            title="Editar"
                          >
                            <FiEdit />
                          </button>
                          <button
                            onClick={() => abrirModal('eliminar', cliente as unknown as ElementoSeleccionable)}
                            className="text-red-500 hover:text-red-600"
                            title="Eliminar"
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

export default memo(ClientesPanel);