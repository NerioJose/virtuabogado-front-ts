'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiUploadCloud, 
    FiX, 
    FiCheckCircle, 
    FiAlertCircle, 
    FiChevronDown, 
    FiChevronUp,
    FiWifiOff
} from 'react-icons/fi';
import { useUploadManagerViewModel } from '../hooks/useUploadManagerViewModel';

/**
 * UploadManager: Orquestador Global de Cargas.
 * Estilo Gmail/Google Drive.
 */
export default function UploadManager() {
    const {
        uploadList,
        hasUploads,
        isExpanded,
        toggleExpanded,
        isOnline,
        removeUpload
    } = useUploadManagerViewModel();

    if (!hasUploads) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 md:w-96">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                {/* Cabecera */}
                <div 
                    className="bg-azul-primario p-4 flex justify-between items-center cursor-pointer"
                    onClick={toggleExpanded}
                >
                    <div className="flex items-center gap-2 text-white">
                        <FiUploadCloud className={uploadList.some(u => u.status === 'uploading') ? 'animate-bounce' : ''} />
                        <span className="font-bold text-sm">
                            {uploadList.length} {uploadList.length === 1 ? 'Archivo' : 'Archivos'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isOnline && <FiWifiOff className="text-amber-300 animate-pulse" title="Conexión Perdida: Pausado" />}
                        <button type="button" className="text-white/80 hover:text-white">
                            {isExpanded ? <FiChevronDown /> : <FiChevronUp />}
                        </button>
                    </div>
                </div>

                {/* Lista de Cargas */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div 
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            exit={{ scaleY: 0 }}
                            style={{ transformOrigin: 'top' }}
                            className="max-h-80 overflow-y-auto bg-slate-50/50"
                        >
                            <div className="p-2 space-y-2">
                                {uploadList.map((upload) => (
                                    <div 
                                        key={upload.id}
                                        className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0 pr-2">
                                                <p className="text-xs font-bold text-gray-800 truncate" title={upload.fileName}>
                                                    {upload.fileName}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    {(upload.fileSize / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            
                                            {/* Acciones segun Estado */}
                                            <div className="flex items-center gap-2">
                                                {upload.status === 'uploading' && (
                                                    <button type="button" 
                                                        onClick={() => removeUpload(upload.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors"
                                                        title="Cancelar subida"
                                                    >
                                                        <FiX size={14} />
                                                    </button>
                                                )}
                                                {upload.status === 'success' && (
                                                    <FiCheckCircle className="text-green-500" size={16} />
                                                )}
                                                {upload.status === 'error' && (
                                                    <FiAlertCircle className="text-red-500" size={16} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Barra de Progreso */}
                                        <div className="space-y-1">
                                            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ scaleX: 0 }}
                                                    animate={{ scaleX: upload.progress / 100 }}
                                                    className={`h-full w-full transition duration-300 ${
                                                        upload.status === 'error' ? 'bg-red-500' :
                                                        upload.status === 'success' ? 'bg-green-500' :
                                                        'bg-azul-primario'
                                                    }`}
                                                    style={{ transformOrigin: 'left' }}
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-azul-primario">
                                                    {upload.status === 'uploading' && !isOnline ? (
                                                        <span className="text-amber-600 animate-pulse">Pausado: Reintentando...</span>
                                                    ) : (
                                                        `${upload.progress}%`
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-gray-400 uppercase font-black">
                                                    {upload.status}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Feedback de Error */}
                                        {upload.status === 'error' && (
                                            <p className="text-[9px] text-red-500 mt-1 font-medium truncate">
                                                {upload.error || 'Fallo de red'}
                                            </p>
                                        )}

                                        {/* Botón para remover si finalizó */}
                                        {(upload.status === 'success' || upload.status === 'error' || upload.status === 'canceled') && (
                                            <button type="button" 
                                                onClick={() => removeUpload(upload.id)}
                                                className="w-full mt-2 py-1 text-[10px] font-bold text-gray-400 hover:text-azul-primario transition-colors border-t border-gray-50 pt-2"
                                            >
                                                Limpiar
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
