import { useState, useMemo } from 'react';
import { FiCalendar, FiClock, FiUser, FiChevronLeft, FiChevronRight, FiBriefcase } from 'react-icons/fi';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';

interface AgendaPanelProps {
  abogadoId: string;
  onVerDetalles?: (casoId: string) => void;
}

export default function AgendaPanel({ abogadoId, onVerDetalles }: AgendaPanelProps) {
  // ============ REACT QUERY ============
  const { data: response, isLoading } = useOrdersByLawyer(abogadoId);
  const orders = response?.data || [];
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date>(new Date());

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

  // Filtrar órdenes por fecha de creación o actualización para la "agenda"
  const casosDelDia = useMemo(() => {
    return orders.filter(order => {
      const fechaOrder = new Date(order.createdAt);
      return fechaOrder.toDateString() === fechaSeleccionada.toDateString();
    });
  }, [orders, fechaSeleccionada]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/30">
        <h2 className="text-lg font-bold text-gray-800">Mi Agenda de Casos</h2>
      </div>

      {/* Selector de fecha */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-gray-50">
        <button
          onClick={() => cambiarDia(-1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <FiChevronLeft className="text-gray-600" size={20} />
        </button>

        <div className="text-center">
          <h3 className="text-sm font-bold text-gray-900 capitalize">
            {formatearFecha(fechaSeleccionada)}
          </h3>
          <p className="text-xs text-azul-primario font-medium mt-1">
            {casosDelDia.length} {casosDelDia.length === 1 ? 'caso iniciado' : 'casos iniciados'} hoy
          </p>
        </div>

        <button
          onClick={() => cambiarDia(1)}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <FiChevronRight className="text-gray-600" size={20} />
        </button>
      </div>

      {/* Lista de Casos */}
      <div className="p-6">
        {casosDelDia.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-gray-300">
              <FiCalendar size={32} />
            </div>
            <h3 className="text-gray-900 font-bold">Sin actividad programada</h3>
            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
              No hay nuevos casos asignados o hitos programados para este día.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {casosDelDia.map((caso) => (
              <div key={caso.id} className="group border border-gray-100 rounded-2xl p-4 hover:shadow-md hover:border-azul-primario/30 transition-all bg-white">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-4">
                    <div className="w-12 h-12 rounded-xl bg-azul-primario/10 text-azul-primario flex items-center justify-center group-hover:bg-azul-primario group-hover:text-white transition-colors">
                      <FiBriefcase size={24} />
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-900">
                        {caso.items?.[0]?.serviceName || 'Servicio Legal'}
                      </h3>
                      <span className="bg-gray-50 text-gray-500 text-[10px] px-2 py-1 rounded-lg font-bold">
                        ID: #{caso.numericId || caso.id.slice(0, 4)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-center text-xs text-gray-500">
                        <FiUser className="mr-2 text-azul-primario" />
                        <span className="font-medium text-gray-700">{caso.userName}</span>
                      </div>

                      <div className="flex items-center text-xs text-gray-500">
                        <FiClock className="mr-2 text-azul-primario" />
                        <span>Recibido: {new Date(caso.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                       <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${
                        caso.status === 'COMPLETADO' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                       }`}>
                        {caso.status}
                       </span>
                       <button 
                         onClick={() => onVerDetalles?.(caso.id)}
                         className="text-xs font-bold text-azul-primario hover:underline"
                       >
                         Ver Detalles
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}