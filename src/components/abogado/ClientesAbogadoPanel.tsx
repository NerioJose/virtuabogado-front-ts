import { useState, useEffect } from 'react';
import { FiUser, FiMail, FiPhone, FiFileText, FiMessageSquare, FiSearch, FiFilter } from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';

interface ClientesAbogadoPanelProps {
  abogadoId: number;
}

interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  fechaAsignacion: string;
  casosActivos: number;
  casosCompletados: number;
  ultimaActividad: string;
  imagen?: string;
}

export default function ClientesAbogadoPanel({ abogadoId }: ClientesAbogadoPanelProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroActividad, setFiltroActividad] = useState<'todos' | 'reciente' | 'inactivo'>('todos');

  useEffect(() => {
    // Simulación de carga de datos
    const cargarClientes = async () => {
      try {
        // Aquí iría la llamada a la API para obtener los clientes del abogado
        // Por ahora, simulamos una respuesta después de 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Datos de ejemplo
        setClientes([
          {
            id: 1,
            nombre: 'María González',
            email: 'maria.gonzalez@ejemplo.com',
            telefono: '+34 612 345 678',
            fechaAsignacion: '2023-05-15',
            casosActivos: 1,
            casosCompletados: 0,
            ultimaActividad: '2023-06-19'
          },
          {
            id: 2,
            nombre: 'Juan Pérez',
            email: 'juan.perez@ejemplo.com',
            telefono: '+34 623 456 789',
            fechaAsignacion: '2023-04-20',
            casosActivos: 1,
            casosCompletados: 1,
            ultimaActividad: '2023-06-18'
          },
          {
            id: 3,
            nombre: 'Elena Díaz',
            email: 'elena.diaz@ejemplo.com',
            telefono: '+34 634 567 890',
            fechaAsignacion: '2023-03-10',
            casosActivos: 0,
            casosCompletados: 2,
            ultimaActividad: '2023-06-17'
          },
          {
            id: 4,
            nombre: 'Roberto Fernández',
            email: 'roberto.fernandez@ejemplo.com',
            telefono: '+34 645 678 901',
            fechaAsignacion: '2023-06-05',
            casosActivos: 1,
            casosCompletados: 0,
            ultimaActividad: '2023-06-15'
          },
          {
            id: 5,
            nombre: 'Laura Martínez',
            email: 'laura.martinez@ejemplo.com',
            telefono: '+34 656 789 012',
            fechaAsignacion: '2023-02-18',
            casosActivos: 0,
            casosCompletados: 1,
            ultimaActividad: '2023-05-20'
          }
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        setLoading(false);
      }
    };
    
    cargarClientes();
  }, [abogadoId]);

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
      cliente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      cliente.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      cliente.telefono.includes(busqueda);
    
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Mis Clientes</h2>
        
        <div className="flex items-center gap-4">
          {/* Buscador */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario"
            />
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          {/* Filtros */}
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-500" />
            <div className="flex gap-2">
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
                Activos
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
        </div>
      </div>
      
      {/* Lista de clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clientesFiltrados.length === 0 ? (
          <div className="col-span-3 text-center py-8 bg-white rounded-lg shadow-sm">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiUser className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-gray-900 font-medium">No se encontraron clientes</h3>
            <p className="text-gray-500 mt-1">No hay clientes que coincidan con los criterios de búsqueda</p>
          </div>
        ) : (
          clientesFiltrados.map((cliente) => (
            <div key={cliente.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 mr-4">
                    <Image
                      src={cliente.imagen || userImage}
                      alt={cliente.nombre}
                      width={60}
                      height={60}
                      className="rounded-full"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{cliente.nombre}</h3>
                    <p className="text-sm text-gray-500">Cliente desde {new Date(cliente.fechaAsignacion).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <FiMail className="text-gray-400 mr-2" />
                    <a href={`mailto:${cliente.email}`} className="text-azul-primario hover:underline">{cliente.email}</a>
                  </div>
                  <div className="flex items-center text-sm">
                    <FiPhone className="text-gray-400 mr-2" />
                    <a href={`tel:${cliente.telefono}`} className="text-gray-700">{cliente.telefono}</a>
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-gray-500 mb-4">
                  <div>
                    <span className="font-medium text-azul-primario">{cliente.casosActivos}</span> casos activos
                  </div>
                  <div>
                    <span className="font-medium text-green-600">{cliente.casosCompletados}</span> completados
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <button className="flex items-center text-sm text-azul-primario hover:text-azul-primario/80">
                    <FiFileText className="mr-1" />
                    Ver casos
                  </button>
                  <button className="flex items-center text-sm text-azul-primario hover:text-azul-primario/80">
                    <FiMessageSquare className="mr-1" />
                    Enviar mensaje
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}