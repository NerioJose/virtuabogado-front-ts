import { useState, useEffect, useRef } from 'react';
import { documentsService, DocumentoItem } from '@/features/documents';
import { ordersService, Order } from '@/features/orders';
import { capitalizeName } from '@/utils/formatters';
import { compressImage } from '@/utils/imageCompression';
import { useResumableUpload } from '@/features/storage/hooks/useResumableUpload';

export interface DocumentoLocal extends DocumentoItem {
  name: string;
  type: string;
  size?: number;
}

interface DocumentApiResponse {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  createdAt: string;
  order?: {
    numericId: number;
    service?: { titulo: string };
    user?: { nombre: string };
  };
}

export function useDocumentosPanel(abogadoId: string) {
  const [documentos, setDocumentos] = useState<DocumentoLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'pdf' | 'doc'>('todos');
  const [notificacion, setNotificacion] = useState<{tipo: 'success' | 'info' | 'error', mensaje: string} | null>(null);
  const [docParaEliminar, setDocParaEliminar] = useState<DocumentoItem | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload } = useResumableUpload();

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
        setDocumentos([]);
        return;
      }
      
      const mappedDocs: DocumentoLocal[] = docs.map((d: DocumentApiResponse) => {
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
          cliente: d.order?.user?.nombre ? capitalizeName(d.order.user.nombre) : 'Desconocido',
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
      const response = await ordersService.getAll({ lawyerId: abogadoId });
      setOrders(response.data || []);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const processUpload = async () => {
    if (!selectedFile || !selectedOrderId) return;

    try {
      setLoading(true);
      setShowUploadModal(false);
      setNotificacion({ tipo: 'info', mensaje: `Iniciando subida de ${selectedFile.name}...` });

      const fileToUpload = await compressImage(selectedFile);
      const publicUrl = await startUpload(selectedOrderId, fileToUpload);

      await documentsService.create({
        orderId: selectedOrderId,
        name: selectedFile.name,
        url: publicUrl,
        type: fileToUpload.type,
        size: fileToUpload.size
      });

      setNotificacion({ tipo: 'success', mensaje: 'Documento sincronizado correctamente' });
      fetchDocumentos();
    } catch (error: any) {
      console.error('Error al subir documento:', error);
      setNotificacion({ tipo: 'error', mensaje: 'Error: La subida falló o fue cancelada' });
    } finally {
      setLoading(false);
      setSelectedFile(null);
      setSelectedOrderId('');
    }
  };

  const handleDescargar = (doc: DocumentoItem) => {
    window.open(doc.url, '_blank');
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

  const documentosFiltrados = documentos.filter(documento => {
    const coincideTermino =
      documento.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (documento.caso && documento.caso.toLowerCase().includes(busqueda.toLowerCase())) ||
      (documento.cliente && documento.cliente.toLowerCase().includes(busqueda.toLowerCase()));

    const coincideTipo = filtroTipo === 'todos' || documento.nombre.toLowerCase().includes(filtroTipo.toLowerCase());

    return coincideTermino && coincideTipo;
  });

  return {
    documentos,
    documentosFiltrados,
    loading,
    orders,
    busqueda,
    setBusqueda,
    filtroTipo,
    setFiltroTipo,
    notificacion,
    docParaEliminar,
    setDocParaEliminar,
    showUploadModal,
    setShowUploadModal,
    selectedOrderId,
    setSelectedOrderId,
    selectedFile,
    fileInputRef,
    handleFileChange,
    processUpload,
    handleDescargar,
    confirmarEliminacion,
  };
}
