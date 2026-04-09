'use client';

import React, { useState, useEffect, useRef } from 'react';
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <div className="w-8 h-8 bg-azul-primario/10 rounded-lg flex items-center justify-center text-azul-primario">
            <FiFolder size={18} />
          </div>
          Mis Documentos
        </h2>

        <button 
          onClick={handleSubirClick}
          className="w-full sm:w-auto bg-azul-primario text-white px-5 py-2.5 rounded-2xl hover:bg-azul-primario/90 transition-all flex items-center justify-center shadow-lg shadow-azul-primario/25 font-bold text-sm active:scale-95">
          <FiUpload className="mr-2" size={18} />
          Subir documento
        </button>
      </div>

      {/* Modal de subida (Restaurado y Mejorado) */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-azul-primario/5">
                <div>
                  <h3 className="text-xl font-black text-azul-primario tracking-tight">Cargar Archivo</h3>
                  <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">Sincronización con expediente</p>
                </div>
                <button 
                  onClick={() => setShowUploadModal(false)} 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Vincular a Caso</label>
                  <select 
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full h-12 px-4 rounded-2xl border-slate-100 bg-slate-50 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-azul-primario focus:border-azul-primario transition-all"
                  >
                    <option value="">Seleccione un caso activo...</option>
                    {orders.map(order => (
                      <option key={order.id} value={order.id}>
                        {order.service?.titulo} - {order.user?.nombre} (#ID: {order.numericId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Expediente Digital</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                      selectedFile ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-100 hover:border-azul-primario hover:bg-azul-primario/[0.02]'
                    }`}
                  >
                    {selectedFile ? (
                      <>
                        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 mb-4 animate-bounce">
                          <FiCheck size={32} />
                        </div>
                        <span className="text-sm font-black text-slate-800 line-clamp-1">{selectedFile.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB / Listo</span>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-4 group-hover:text-azul-primario transition-colors">
                          <FiUpload size={32} />
                        </div>
                        <span className="text-sm font-black text-slate-400 group-hover:text-azul-primario transition-colors">Seleccionar Archivo</span>
                        <p className="text-[10px] font-bold text-slate-300 mt-2 uppercase tracking-widest font-mono">PDF, DOC, JPG, PNG</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 h-14 bg-slate-50 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-widest"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={!selectedFile || !selectedOrderId || loading}
                    onClick={processUpload}
                    className="flex-[2] h-14 bg-azul-primario text-white rounded-2xl font-black text-xs hover:shadow-xl hover:shadow-azul-primario/25 transition-all disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-widest shadow-lg shadow-azul-primario/20"
                  >
                    {loading ? 'Sincronizando...' : 'Subir Expediente'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Buscador y Filtros Adaptativos */}
      <div className="flex flex-col gap-4 bg-slate-50 p-4 rounded-[2rem] border border-slate-100">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por caso, cliente o archivo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-11 pr-4 py-3 w-full bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-azul-primario text-sm placeholder:text-slate-400 font-medium"
          />
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tipo:</span>
          <div className="flex gap-2 min-w-max">
            {[
              { id: 'todos', label: 'Todos', color: 'bg-azul-primario' },
              { id: 'pdf', label: 'PDFs', color: 'bg-rose-500' },
              { id: 'doc', label: 'Word', color: 'bg-blue-500' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFiltroTipo(f.id as any)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${filtroTipo === f.id
                  ? `${f.color} text-white shadow-md`
                  : 'bg-white text-slate-500 hover:text-azul-primario'
                  }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VISTA MÓVIL (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden pb-10">
        {documentosFiltrados.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
             <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <FiFolder size={32} />
             </div>
             <p className="text-slate-400 font-bold">No se encontraron documentos</p>
          </div>
        ) : (
          documentosFiltrados.map((doc) => (
            <motion.div 
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform">
                  {obtenerIconoDocumento(doc.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-800 text-sm truncate mb-0.5">
                    {doc.nombre}
                  </h4>
                  <p className="text-[10px] font-bold text-azul-primario uppercase tracking-tighter truncate">{doc.caso}</p>
                  
                  <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center gap-1">
                      <FiClock size={12} />
                      {doc.fechaSubida}
                    </span>
                    <span>{doc.tamaño}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-50 flex gap-2">
                <button
                  onClick={() => handleDescargar(doc)}
                  className="flex-1 py-2.5 bg-slate-50 text-azul-primario rounded-xl font-black text-[11px] flex items-center justify-center gap-2 hover:bg-azul-primario hover:text-white transition-all active:scale-95"
                >
                  <FiDownload size={14} />
                  DESCARGAR
                </button>
                <button
                  onClick={() => handleEliminar(doc)}
                  className="w-12 h-[42px] bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* VISTA DESKTOP (Tabla) */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-50">
          <thead className="bg-slate-50/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente / Caso</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Subida</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamaño</th>
              <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {documentosFiltrados.map((documento) => (
              <tr key={documento.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {obtenerIconoDocumento(documento.nombre)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-black text-slate-800">{documento.nombre}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black leading-none">{documento.tipo}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-black text-slate-700">{documento.cliente || 'Desconocido'}</div>
                  <div className="text-xs text-azul-primario font-bold tracking-tight">{documento.caso || 'Sin caso'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-500 font-bold flex items-center">
                    <FiClock className="mr-1.5 text-slate-300" size={14} />
                    {documento.fechaSubida}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-slate-400 font-black font-mono">{documento.tamaño}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleDescargar(documento)}
                      className="w-10 h-10 bg-slate-50 text-azul-primario rounded-xl hover:bg-azul-primario hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm"
                      title="Descargar / Ver"
                    >
                      <FiDownload size={18} />
                    </button>
                    <button
                      onClick={() => handleEliminar(documento)}
                      className="w-10 h-10 bg-slate-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm"
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
