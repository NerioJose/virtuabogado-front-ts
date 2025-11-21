import { useState, useEffect } from 'react';
import { FiFile, FiFileText, FiDownload, FiUpload, FiTrash2, FiFolder, FiSearch } from 'react-icons/fi';

interface DocumentosPanelProps {
  abogadoId: number;
}

interface Documento {
  id: number;
  nombre: string;
  tipo: string;
  caso?: string;
  cliente?: string;
  fechaSubida: string;
  tamaño: string;
  url: string;
}

export default function DocumentosPanel({ abogadoId }: DocumentosPanelProps) {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'contratos' | 'demandas' | 'informes' | 'otros'>('todos');

  useEffect(() => {
    // Simulación de carga de datos
    const cargarDocumentos = async () => {
      try {
        // Aquí iría la llamada a la API para obtener los documentos del abogado
        // Por ahora, simulamos una respuesta después de 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Datos de ejemplo
        setDocumentos([
          {
            id: 1,
            nombre: 'Contrato laboral - María González',
            tipo: 'contratos',
            caso: 'Consulta sobre contrato laboral',
            cliente: 'María González',
            fechaSubida: '2023-06-18',
            tamaño: '2.4 MB',
            url: '/documentos/contrato-laboral-maria.pdf'
          },
          {
            id: 2,
            nombre: 'Demanda de divorcio - Juan Pérez',
            tipo: 'demandas',
            caso: 'Asesoría en divorcio',
            cliente: 'Juan Pérez',
            fechaSubida: '2023-06-14',
            tamaño: '3.1 MB',
            url: '/documentos/demanda-divorcio-juan.pdf'
          },
          {
            id: 3,
            nombre: 'Informe pericial - Caso Elena Díaz',
            tipo: 'informes',
            caso: 'Consulta sobre herencia',
            cliente: 'Elena Díaz',
            fechaSubida: '2023-06-11',
            tamaño: '5.7 MB',
            url: '/documentos/informe-pericial-elena.pdf'
          },
          {
            id: 4,
            nombre: 'Contrato mercantil - Roberto Fernández',
            tipo: 'contratos',
            caso: 'Revisión de contrato mercantil',
            cliente: 'Roberto Fernández',
            fechaSubida: '2023-06-10',
            tamaño: '1.8 MB',
            url: '/documentos/contrato-mercantil-roberto.pdf'
          },
          {
            id: 5,
            nombre: 'Plantilla de contrato de arrendamiento',
            tipo: 'otros',
            fechaSubida: '2023-05-20',
            tamaño: '1.2 MB',
            url: '/documentos/plantilla-contrato-arrendamiento.docx'
          }
        ]);

        setLoading(false);
      } catch (error) {
        console.error('Error al cargar documentos:', error);
        setLoading(false);
      }
    };

    cargarDocumentos();
  }, [abogadoId]);

  // Filtrar documentos según término de búsqueda y filtro de tipo
  const documentosFiltrados = documentos.filter(documento => {
    const coincideTermino =
      documento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (documento.caso && documento.caso.toLowerCase().includes(busqueda.toLowerCase())) ||
      (documento.cliente && documento.cliente.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideTipo = filtroTipo === 'todos' || documento.tipo === filtroTipo;

    return coincideTermino && coincideTipo;
  });

  // Función para obtener el icono según el tipo de documento
  const obtenerIconoDocumento = (nombre: string) => {
    const extension = nombre.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      return <FiFileText className="text-red-500" />;
    } else if (extension === 'docx' || extension === 'doc') {
      return <FiFileText className="text-blue-500" />;
    } else if (extension === 'xlsx' || extension === 'xls') {
      return <FiFileText className="text-green-500" />;
    } else {
      return <FiFile className="text-gray-500" />;
    }
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Mis Documentos</h2>

        <button className="bg-azul-primario text-white px-4 py-2 rounded-lg hover:bg-azul-primario/90 transition-colors flex items-center">
          <FiUpload className="mr-2" />
          Subir documento
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Buscador */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar documento..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario"
          />
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">Filtrar por:</span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-3 py-1 rounded-full text-sm ${filtroTipo === 'todos'
                  ? 'bg-azul-primario text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipo('contratos')}
              className={`px-3 py-1 rounded-full text-sm ${filtroTipo === 'contratos'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Contratos
            </button>
            <button
              onClick={() => setFiltroTipo('demandas')}
              className={`px-3 py-1 rounded-full text-sm ${filtroTipo === 'demandas'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Demandas
            </button>
            <button
              onClick={() => setFiltroTipo('informes')}
              className={`px-3 py-1 rounded-full text-sm ${filtroTipo === 'informes'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Informes
            </button>
          </div>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {documentosFiltrados.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiFolder className="text-gray-400 text-xl" />
            </div>
            <h3 className="text-gray-900 font-medium">No se encontraron documentos</h3>
            <p className="text-gray-500 mt-1">No hay documentos que coincidan con los criterios de búsqueda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente / Caso
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documentosFiltrados.map((documento) => (
                  <tr key={documento.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                          {obtenerIconoDocumento(documento.nombre)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{documento.nombre}</div>
                          <div className="text-sm text-gray-500">{documento.tipo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {documento.cliente && (
                        <div className="text-sm text-gray-900">{documento.cliente}</div>
                      )}
                      {documento.caso && (
                        <div className="text-sm text-gray-500">{documento.caso}</div>
                      )}
                      {!documento.cliente && !documento.caso && (
                        <div className="text-sm text-gray-500">-</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{documento.fechaSubida}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{documento.tamaño}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          className="text-azul-primario hover:text-azul-primario/80"
                          title="Descargar"
                        >
                          <FiDownload size={18} />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          title="Eliminar"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}