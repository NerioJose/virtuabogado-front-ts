import { useState, useEffect } from 'react';
import { FiCalendar, FiClock, FiUser, FiMapPin, FiPlus, FiChevronLeft, FiChevronRight, FiVideo, FiLink } from 'react-icons/fi';

interface AgendaPanelProps {
  abogadoId: number;
}

interface Cita {
  id: number;
  titulo: string;
  cliente: string;
  fecha: string;
  hora: string;
  duracion: string;
  tipo: 'presencial' | 'virtual';
  ubicacion?: string;
  enlaceVirtual?: string;
  notas?: string;
}

export default function AgendaPanel({ abogadoId }: AgendaPanelProps) {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());
  
  useEffect(() => {
    // Simulación de carga de datos
    const cargarCitas = async () => {
      try {
        // Aquí iría la llamada a la API para obtener las citas del abogado
        // Por ahora, simulamos una respuesta después de 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Datos de ejemplo
        setCitas([
          {
            id: 1,
            titulo: 'Consulta inicial',
            cliente: 'María González',
            fecha: '2023-06-20',
            hora: '10:00',
            duracion: '60 minutos',
            tipo: 'virtual',
            enlaceVirtual: 'https://meet.virtuabogado.com/123456',
            notas: 'Primera consulta sobre caso laboral'
          },
          {
            id: 2,
            titulo: 'Revisión de documentos',
            cliente: 'Juan Pérez',
            fecha: '2023-06-20',
            hora: '12:00',
            duracion: '45 minutos',
            tipo: 'presencial',
            ubicacion: 'Despacho principal',
            notas: 'Traer documentos del divorcio'
          },
          {
            id: 3,
            titulo: 'Seguimiento de caso',
            cliente: 'Elena Díaz',
            fecha: '2023-06-21',
            hora: '16:30',
            duracion: '30 minutos',
            tipo: 'virtual',
            enlaceVirtual: 'https://meet.virtuabogado.com/789012'
          },
          {
            id: 4,
            titulo: 'Firma de contrato',
            cliente: 'Roberto Fernández',
            fecha: '2023-06-22',
            hora: '11:15',
            duracion: '45 minutos',
            tipo: 'presencial',
            ubicacion: 'Despacho principal'
          },
          {
            id: 5,
            titulo: 'Consulta de seguimiento',
            cliente: 'Laura Martínez',
            fecha: '2023-06-23',
            hora: '09:30',
            duracion: '60 minutos',
            tipo: 'virtual',
            enlaceVirtual: 'https://meet.virtuabogado.com/345678',
            notas: 'Revisar avances del caso laboral'
          }
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error al cargar citas:', error);
        setLoading(false);
      }
    };
    
    cargarCitas();
  }, [abogadoId]);

  // Función para formatear fecha
  const formatearFecha = (fecha: Date): string => {
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Función para cambiar de día
  const cambiarDia = (dias: number) => {
    const nuevaFecha = new Date(fechaSeleccionada);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    setFechaSeleccionada(nuevaFecha);
  };

  // Filtrar citas por fecha seleccionada
  const citasDelDia = citas.filter(cita => {
    const fechaCita = new Date(cita.fecha);
    return fechaCita.toDateString() === fechaSeleccionada.toDateString();
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Ordenar citas por hora
  const citasOrdenadas = [...citasDelDia].sort((a, b) => {
    return a.hora.localeCompare(b.hora);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Mi Agenda</h2>
      </div>
      
      {/* Selector de fecha */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <button 
          onClick={() => cambiarDia(-1)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <FiChevronLeft className="text-gray-600" />
        </button>
        
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">
            {formatearFecha(fechaSeleccionada)}
          </h3>
          <p className="text-sm text-gray-500">
            {citasDelDia.length} {citasDelDia.length === 1 ? 'cita' : 'citas'} programadas
          </p>
        </div>
        
        <button 
          onClick={() => cambiarDia(1)}
          className="p-2 rounded-full hover:bg-gray-100"
        >
          <FiChevronRight className="text-gray-600" />
        </button>
      </div>
      
      {/* Lista de citas */}
      <div className="px-6 py-4">
        {citasOrdenadas.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiCalendar className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-gray-900 font-medium">No hay citas programadas</h3>
            <p className="text-gray-500 mt-1">No tienes citas programadas para este día</p>
          </div>
        ) : (
          <div className="space-y-6">
            {citasOrdenadas.map((cita) => (
              <div key={cita.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      cita.tipo === 'virtual' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {cita.tipo === 'virtual' ? <FiVideo size={20} /> : <FiMapPin size={20} />}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">{cita.titulo}</h3>
                      <span className="bg-azul-claro/20 text-azul-primario text-xs px-2 py-1 rounded-full">
                        {cita.duracion}
                      </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="flex items-center text-gray-600">
                        <FiUser className="mr-2 text-gray-400" />
                        <span>{cita.cliente}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <FiClock className="mr-2 text-gray-400" />
                        <span>{cita.hora}</span>
                      </div>
                      
                      {cita.tipo === 'presencial' && cita.ubicacion && (
                        <div className="flex items-center text-gray-600">
                          <FiMapPin className="mr-2 text-gray-400" />
                          <span>{cita.ubicacion}</span>
                        </div>
                      )}
                      
                      {cita.tipo === 'virtual' && cita.enlaceVirtual && (
                        <div className="flex items-center text-gray-600">
                          <FiLink className="mr-2 text-gray-400" />
                          <a 
                            href={cita.enlaceVirtual} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-azul-primario hover:underline"
                          >
                            Enlace de reunión
                          </a>
                        </div>
                      )}
                    </div>
                    
                    {cita.notas && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
                        <p>{cita.notas}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Botón para añadir nueva cita */}
      <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
        <button className="flex items-center px-4 py-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-colors">
          <FiPlus className="mr-2" />
          Nueva cita
        </button>
      </div>
    </div>
  );
}