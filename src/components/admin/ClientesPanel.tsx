import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiEye, FiFilter, FiMail, FiPhone } from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';

interface ClientesPanelProps {
  terminoBusqueda: string;
  abrirModal: (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: any) => void;
}

interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  fechaRegistro: string;
  casosActivos: number;
  casosCompletados: number;
  gastoTotal: number;
  ultimaActividad: string;
  imagen?: string;
}

export default function ClientesPanel({ terminoBusqueda, abrirModal }: ClientesPanelProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroActividad, setFiltroActividad] = useState<'todos' | 'reciente' | 'inactivo'>('todos');

  useEffect(() => {
    // Aquí se haría la llamada a la API para obtener los clientes
    // Por ahora usamos datos de ejemplo
    setTimeout(() => {
      setClientes([
        {
          id: 1,
          nombre: 'Juan Pérez',
          email: 'juan.perez@ejemplo.com',
          telefono: '+34 612 345 678',
          fechaRegistro: '2023-01-15',
          casosActivos: 2,
          casosCompletados: 3,
          gastoTotal: 750,
          ultimaActividad: '2023-06-10'
        },
        {
          id: 2,
          nombre: 'María García',
          email: 'maria.garcia@ejemplo.com',
          telefono: '+34 623 456 789',
          fechaRegistro: '2023-02-20',
          casosActivos: 1,
          casosCompletados: 0,
          gastoTotal: 250,
          ultimaActividad: '2023-06-15'
        },
        {
          id: 3,
          nombre: 'Pedro Sánchez',
          email: 'pedro.sanchez@ejemplo.com',
          telefono: '+34 634 567 890',
          fechaRegistro: '2023-03-05',
          casosActivos: 0,
          casosCompletados: 2,
          gastoTotal: 500,
          ultimaActividad: '2023-05-20'
        },
        {
          id: 4,
          nombre: 'Ana Martínez',
          email: 'ana.martinez@ejemplo.com',
          telefono: '+34 645 678 901',
          fechaRegistro: '2023-04-10',
          casosActivos: 1,
          casosCompletados: 1,
          gastoTotal: 350,
          ultimaActividad: '2023-06-12'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // Calcular si un cliente ha estado activo recientemente (últimos 30 días)
  const esClienteReciente = (ultimaActividad: string) => {
    const fechaActividad = new Date(ultimaActividad);
    const hoy = new Date();
    const diferenciaDias = Math.floor((hoy.getTime() - fechaActividad.getTime()) / (1000 * 60 * 60 * 24));
    return diferenciaDias <= 30;
  };

  // Filtrar clientes según término de búsqueda y filtro de actividad
  const clientesFiltrados = clientes.filter(cliente => {
    const coincideTermino = 
      cliente.nombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      cliente.email.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      cliente.telefono.includes(terminoBusqueda);
    
    if (filtroActividad === 'todos') return coincideTermino;
    if (filtroActividad === 'reciente') return coincideTermino && esClienteReciente(cliente.ultimaActividad);
    if (filtroActividad === 'inactivo') return coincideTermino && !esClienteReciente(cliente.ultimaActividad);
    
    return coincideTermino;
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
          <span className="text-gray-700 font-medium">Filtrar por actividad:</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroActividad('todos')}
            className={`px-3 py-1 rounded-full text-sm ${
              filtroActividad === 'todos' 
                ? 'bg-azul-primario text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroActividad('reciente')}
            className={`px-3 py-1 rounded-full text-sm ${
              filtroActividad === 'reciente' 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Activos recientemente
          </button>
          <button
            onClick={() => setFiltroActividad('inactivo')}
            className={`px-3 py-1 rounded-full text-sm ${
              filtroActividad === 'inactivo' 
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
                  Casos
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gasto Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Última Actividad
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
                    No se encontraron clientes con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                          <Image
                            src={cliente.imagen || userImage}
                            alt={cliente.nombre}
                            fill
                            className="rounded-full object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{cliente.nombre}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 flex items-center">
                        <FiMail className="mr-1" /> {cliente.email}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <FiPhone className="mr-1" /> {cliente.telefono}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(cliente.fechaRegistro).toLocaleDateString('es-ES')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {cliente.casosActivos} activos
                      </div>
                      <div className="text-sm text-gray-500">
                        {cliente.casosCompletados} completados
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {cliente.gastoTotal.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(cliente.ultimaActividad).toLocaleDateString('es-ES')}
                      </div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        esClienteReciente(cliente.ultimaActividad) 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {esClienteReciente(cliente.ultimaActividad) ? 'Reciente' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => abrirModal('ver', cliente)}
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Ver detalles"
                        >
                          <FiEye />
                        </button>
                        <button
                          onClick={() => abrirModal('editar', cliente)}
                          className="text-amber-500 hover:text-amber-600"
                          title="Editar"
                        >
                          <FiEdit />
                        </button>
                        <button
                          onClick={() => abrirModal('eliminar', cliente)}
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