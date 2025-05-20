import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiAlertTriangle, FiCheck } from 'react-icons/fi';

// Interfaces para los diferentes tipos de elementos
interface Abogado {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  especialidad: string;
  disponibilidad: string;
  fechaRegistro: string;
  estado: 'activo' | 'inactivo' | 'pendiente';
  casosActivos: number;
  casosCompletados: number;
  valoracionMedia: number;
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

interface Caso {
  id: number;
  titulo: string;
  cliente: string;
  abogado?: string;
  fechaCreacion: string;
  fechaAsignacion?: string;
  estado: 'pendiente' | 'asignado' | 'en_proceso' | 'completado' | 'cancelado';
  prioridad: 'baja' | 'media' | 'alta';
  tipo: string;
  descripcion: string;
}

interface Transaccion {
  id: number;
  concepto: string;
  monto: number;
  fecha: string;
  tipo: 'ingreso' | 'gasto' | 'pago_abogado';
  estado: 'completado' | 'pendiente' | 'cancelado';
  cliente?: string;
  abogado?: string;
  caso?: string;
  metodoPago?: string;
}

// Tipo unión para todos los posibles elementos
type ElementoModal = Abogado | Cliente | Caso | Transaccion;

// Tipo para el formulario
type FormDataType = Record<string, string | number | boolean>;

interface ModalContainerProps {
  tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar';
  seccion: 'abogados' | 'clientes' | 'casos' | 'finanzas' | 'configuracion';
  elemento: ElementoModal;
  cerrarModal: () => void;
}

export default function ModalContainer({ tipo, seccion, elemento, cerrarModal }: ModalContainerProps) {
  // Estado para el formulario
  const [formData, setFormData] = useState<FormDataType>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Cargar datos del elemento si es edición o visualización
  useEffect(() => {
    if (elemento && (tipo === 'editar' || tipo === 'ver' || tipo === 'eliminar' || tipo === 'asignar')) {
      setFormData({ ...elemento });
    }
  }, [elemento, tipo]);
  
  // Función para manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData({
        ...formData,
        [name]: checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  
  // Función para enviar el formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Aquí iría la lógica para enviar los datos a la API según el tipo de acción
      // Por ahora, simulamos una respuesta exitosa después de 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      
      // Cerrar el modal después de 1.5 segundos
      setTimeout(() => {
        cerrarModal();
      }, 1500);
    } catch (err) {
      setError('Ocurrió un error al procesar la solicitud. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  // Función para confirmar eliminación
  const confirmarEliminacion = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Aquí iría la lógica para eliminar el elemento
      // Por ahora, simulamos una respuesta exitosa después de 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      
      // Cerrar el modal después de 1.5 segundos
      setTimeout(() => {
        cerrarModal();
      }, 1500);
    } catch (err) {
      setError('Ocurrió un error al eliminar. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };
  
  // Obtener título del modal según tipo y sección
  const obtenerTitulo = () => {
    const accion = 
      tipo === 'crear' ? 'Crear nuevo' :
      tipo === 'editar' ? 'Editar' :
      tipo === 'eliminar' ? 'Eliminar' :
      tipo === 'ver' ? 'Detalles de' :
      'Asignar';
    
    const entidad = 
      seccion === 'abogados' ? 'abogado' :
      seccion === 'clientes' ? 'cliente' :
      seccion === 'casos' ? 'caso' :
      seccion === 'finanzas' ? 'transacción' :
      'elemento';
    
    return `${accion} ${entidad}`;
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Cabecera del modal */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">{obtenerTitulo()}</h2>
          <button
            onClick={cerrarModal}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        
        {/* Contenido del modal */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {success ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <FiCheck className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {tipo === 'eliminar' ? 'Eliminado correctamente' : 'Guardado correctamente'}
                </h3>
                <p className="text-sm text-gray-500">
                  {tipo === 'eliminar' 
                    ? 'El elemento ha sido eliminado de la base de datos.' 
                    : 'Los cambios han sido guardados correctamente.'}
                </p>
              </div>
            </div>
          ) : tipo === 'eliminar' ? (
            <div className="py-4">
              <div className="flex items-center justify-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <FiAlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-center text-gray-900 mb-2">
                ¿Estás seguro de que deseas eliminar este elemento?
              </h3>
              <p className="text-sm text-center text-gray-500 mb-6">
                Esta acción no se puede deshacer. Se eliminarán permanentemente los datos asociados.
              </p>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Aquí iría el formulario específico según la sección y tipo */}
              <p className="text-gray-500 mb-4">
                {tipo === 'ver' 
                  ? 'Detalles del elemento seleccionado.' 
                  : 'Completa el formulario con la información requerida.'}
              </p>
              
              {/* Ejemplo de formulario genérico */}
              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                    {error}
                  </div>
                )}
                
                <div className="space-y-4">
                  {/* Aquí se renderizarían los campos específicos según la sección */}
                  <p className="text-sm text-gray-500 italic">
                    Los campos del formulario se generarían dinámicamente según el tipo de elemento.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
        
        {/* Pie del modal con botones de acción */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          {!success && (
            <>
              <button
                type="button"
                onClick={cerrarModal}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario"
              >
                Cancelar
              </button>
              
              {tipo === 'eliminar' ? (
                <button
                  type="button"
                  onClick={confirmarEliminacion}
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </button>
              ) : tipo !== 'ver' && (
                <button
                  type="submit"
                  form="modal-form"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}