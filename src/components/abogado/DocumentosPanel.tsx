'use client';

import React from 'react';
import { FiFolder, FiUpload, FiX, FiCheck, FiClock, FiSearch } from 'react-icons/fi';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import DocumentList, { DocumentoItem } from '@/features/documents/components/DocumentList';
import { useDocumentosPanel } from './hooks/useDocumentosPanel';

interface DocumentosPanelProps {
  abogadoId: string;
}

// Los tipos se heredan del hook useDocumentosPanel que ya extiende DocumentoItem
export default function DocumentosPanel({ abogadoId }: DocumentosPanelProps) {
  const {
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
  } = useDocumentosPanel(abogadoId);

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
          onClick={() => setShowUploadModal(true)}
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

      {/* Lista de Documentos (Componente Reutilizable) */}
      <DocumentList 
        documentos={documentosFiltrados}
        onDescargar={handleDescargar}
        onEliminar={setDocParaEliminar}
      />

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
