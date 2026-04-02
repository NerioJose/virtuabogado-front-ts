import { useState, useEffect, useRef } from 'react';
import { FiFile, FiFileText, FiDownload, FiUpload, FiTrash2, FiFolder, FiSearch, FiCheck, FiClock, FiX } from 'react-icons/fi';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { createClient } from '@/utils/supabase/client';
import { documentsService } from '@/features/documents/services/documents.service';
import { ordersService } from '@/features/orders/services/orders.service';
import { Order } from '@/features/orders/types/orders.types';
import { motion, AnimatePresence } from 'framer-motion';
import { capitalizeName } from '@/utils/formatters';
import { useResumableUpload } from '@/features/storage/hooks/useResumableUpload';
import { compressImage } from '@/utils/imageCompression';

interface DocumentosPanelProps {
  abogadoId: string;
}

interface DocumentoLocal {
  id: string;
  name: string; // Changed to match API
  nombre: string; // Keep for legacy if needed/mapped
  type: string;
  tipo: string;
  caso?: string;
  cliente?: string;
  fechaSubida: string;
  tamaño: string;
  url: string;
}
export default function DocumentosPanel({ abogadoId }: DocumentosPanelProps) {
  const supabase = createClient();
  const [documentos, setDocumentos] = useState<DocumentoLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'pdf' | 'doc'>('todos');
  const [notificacion, setNotificacion] = useState<{tipo: 'success' | 'info' | 'error', mensaje: string} | null>(null);
  const [docParaEliminar, setDocParaEliminar] = useState<DocumentoLocal | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocumentos = async () => {
    if (!abogadoId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`/api/documents?lawyerId=${abogadoId}`);
      const docs = await response.json();
      
      if (!Array.isArray(docs)) {
        console.error('API did not return an array:', docs);
        setDocumentos([]);
        return;
      }
      
      const mappedDocs: DocumentoLocal[] = docs.map((d: any) => {
        let fecha = 'Pendiente';
        try {
          if (d.createdAt) {
            fecha = new Date(d.createdAt).toISOString().split('T')[0];
          }
        } catch (e) {
          console.error('Error parsing date:', d.createdAt);
        }

        return {
          id: d.id,
          name: d.name || 'Sin nombre',
          nombre: d.name || 'Sin nombre',
          type: d.type || 'Documento',
          tipo: d.type || 'Documento',
          caso: d.order ? `${d.order.service?.titulo || 'Servicio'} (#${d.order.numericId || '?'})` : undefined,
          cliente: capitalizeName(d.order?.user?.nombre) || 'Desconocido',
          fechaSubida: fecha,
          tamaño: d.size ? `${(d.size / 1024 / 1024).toFixed(2)} MB` : 'N/A',
          url: d.url || '#'
        };
      });
      
      setDocumentos(mappedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setNotificacion({ tipo: 'error', mensaje: 'Error al cargar los documentos' });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    if (!abogadoId) return;
    
    try {
      console.log('Fetching orders for upload modal...');
      const response = await ordersService.getAll({ lawyerId: abogadoId });
      const data = response.data || [];
      setOrders(data);
      console.log(`Fetched ${data.length} orders successfully.`);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  useEffect(() => {
    fetchDocumentos();
    fetchOrders();
  }, [abogadoId]);

  useEffect(() => {
    if (notificacion) {
      const timer = setTimeout(() => setNotificacion(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notificacion]);

  const handleSubirClick = () => {
    setShowUploadModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const { startUpload } = useResumableUpload();

  const processUpload = async () => {
    if (!selectedFile || !selectedOrderId) return;

    try {
      setLoading(true);
      setShowUploadModal(false);
      setNotificacion({ tipo: 'info', mensaje: `Iniciando subida de ${selectedFile.name}...` });

      // A. Compresión (Worker-based)
      const fileToUpload = await compressImage(selectedFile);

      // B. Subida Reanudable (TUS)
      // El startUpload ya gestiona el registro en el UploadManager y el progreso
      const publicUrl = await startUpload(selectedOrderId, fileToUpload);

      // C. Registro en Base de Datos Técnica
      await documentsService.create({
        orderId: selectedOrderId,
        name: selectedFile.name,
        url: publicUrl,
        type: fileToUpload.type,
        size: fileToUpload.size
      });

      setNotificacion({ tipo: 'success', mensaje: 'Documento sincronizado correctamente' });
      fetchDocumentos(); // Recargar lista
    } catch (error: any) {
      console.error('Error al subir documento:', error);
      setNotificacion({ tipo: 'error', mensaje: 'Error: La subida falló o fue cancelada' });
    } finally {
      setLoading(false);
      setSelectedFile(null);
      setSelectedOrderId('');
    }
  };

  const handleDescargar = (doc: DocumentoLocal) => {
    window.open(doc.url, '_blank');
  };

  const handleEliminar = (doc: DocumentoLocal) => {
    setDocParaEliminar(doc);
  };

  const confirmarEliminacion = async () => {
    if (docParaEliminar) {
      try {
        await documentsService.delete(docParaEliminar.id);
        setNotificacion({ tipo: 'success', mensaje: `Documento eliminado` });
        fetchDocumentos();
      } catch (error) {
        console.error('Error deleting document:', error);
      } finally {
        setDocParaEliminar(null);
      }
    }
  };

  // Filtrar documentos según término de búsqueda y filtro de tipo
  const documentosFiltrados = documentos.filter(documento => {
    const coincideTermino =
      documento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (documento.caso && documento.caso.toLowerCase().includes(busqueda.toLowerCase())) ||
      (documento.cliente && documento.cliente.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideTipo = filtroTipo === 'todos' || documento.nombre.toLowerCase().includes(filtroTipo.toLowerCase());

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

  if (loading && documentos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notificación */}
      {notificacion && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right-4 ${
          notificacion.tipo === 'success' ? 'bg-green-600 text-white' : 
          notificacion.tipo === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
        }`}>
          {notificacion.tipo === 'success' ? <FiCheck /> : <FiClock />}
          <span>{notificacion.mensaje}</span>
        </div>
      )}

      {/* Input de archivo oculto */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Mis Documentos</h2>

        <button 
          onClick={handleSubirClick}
          className="bg-azul-primario text-white px-4 py-2 rounded-lg hover:bg-azul-primario/90 transition-colors flex items-center shadow-md">
          <FiUpload className="mr-2" />
          Subir documento
        </button>
      </div>

      {/* Modal de subida */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-azul-primario text-white">
                <h3 className="text-lg font-bold">Subir Documento</h3>
                <button onClick={() => setShowUploadModal(false)} className="hover:rotate-90 transition-transform">
                  <FiX size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Caso (Obligatorio)</label>
                  <select 
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario"
                  >
                    <option value="">Seleccione un caso...</option>
                    {orders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.service?.titulo} - {order.user?.nombre} (#{order.numericId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Archivo</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-azul-primario hover:bg-azul-claro/5'
                    }`}
                  >
                    {selectedFile ? (
                      <>
                        <FiCheck className="text-green-500 mb-2" size={32} />
                        <span className="text-sm font-medium text-gray-900 line-clamp-1">{selectedFile.name}</span>
                        <span className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      </>
                    ) : (
                      <>
                        <FiUpload className="text-gray-400 mb-2" size={32} />
                        <span className="text-sm text-gray-600">Haz clic para seleccionar un archivo</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={!selectedFile || !selectedOrderId || loading}
                    onClick={processUpload}
                    className="flex-1 px-4 py-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md"
                  >
                    {loading ? 'Subiendo...' : 'Subir Ahora'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Buscador */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar por caso, cliente o nombre de archivo..."
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
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroTipo === 'todos'
                ? 'bg-azul-primario text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroTipo('pdf')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroTipo === 'pdf'
                ? 'bg-red-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              PDFs
            </button>
            <button
              onClick={() => setFiltroTipo('doc')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filtroTipo === 'doc'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Word
            </button>
          </div>
        </div>
      </div>

      {/* Lista de documentos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        {documentosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <FiFolder size={32} />
            </div>
            <h3 className="text-gray-900 font-medium">No se encontraron documentos</h3>
            <p className="text-gray-500 mt-1">Sube el primer documento de un caso para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Documento
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Cliente / Caso
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Fecha de Subida
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tamaño
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {documentosFiltrados.map((documento) => (
                  <tr key={documento.id} className="hover:bg-azul-claro/5 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          {obtenerIconoDocumento(documento.nombre)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900">{documento.nombre}</div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-tighter font-bold">{documento.tipo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{documento.cliente || 'Desconocido'}</div>
                      <div className="text-xs text-azul-primario font-medium">{documento.caso || 'Sin caso'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 flex items-center">
                        <FiClock className="mr-1.5 text-gray-400" size={14} />
                        {documento.fechaSubida}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 font-mono">{documento.tamaño}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1">
                        <button
                          onClick={() => handleDescargar(documento)}
                          className="text-azul-primario hover:bg-azul-primario hover:text-white p-2 rounded-lg transition-all"
                          title="Descargar / Ver"
                        >
                          <FiDownload size={18} />
                        </button>
                        <button
                          onClick={() => handleEliminar(documento)}
                          className="text-red-500 hover:bg-red-500 hover:text-white p-2 rounded-lg transition-all"
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

      <ConfirmModal 
        isOpen={!!docParaEliminar}
        onClose={() => setDocParaEliminar(null)}
        onConfirm={confirmarEliminacion}
        title="Eliminar Documento"
        message={`¿Estás seguro de que deseas eliminar el documento "${docParaEliminar?.nombre}"? Esta acción no se puede deshacer y el archivo será borrado de forma permanente.`}
        confirmText="Sí, eliminar de forma permanente"
      />
    </div>
  );
}
