'use client';

import React from 'react';
import { FiFile, FiFileText, FiDownload, FiTrash2, FiClock, FiFolder } from 'react-icons/fi';
import { motion } from 'framer-motion';

import { useDocumentListViewModel } from '../hooks/useDocumentListViewModel';

export interface DocumentoItem {
  id: string;
  nombre: string;
  tipo: string;
  caso?: string;
  cliente?: string;
  fechaSubida: string;
  tamaño: string;
  url: string;
}

interface DocumentListProps {
  documentos: DocumentoItem[];
  onDescargar: (doc: DocumentoItem) => void;
  onEliminar: (doc: DocumentoItem) => void;
  showActions?: boolean;
}

export default function DocumentList({ 
  documentos, 
  onDescargar, 
  onEliminar,
  showActions = true
}: DocumentListProps) {
  
  const { obtenerIconoDocumento } = useDocumentListViewModel();

  if (documentos.length === 0) {
    return (
      <div className="py-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-100">
         <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
            <FiFolder size={32} />
         </div>
         <p className="text-slate-400 font-bold">No se encontraron documentos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* VISTA MÓVIL (Cards) */}
      <div className="grid grid-cols-1 gap-4 md:hidden pb-10">
        {documentos.map((doc) => (
          <motion.div 
            key={doc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform">
                {obtenerIconoDocumento(doc.nombre).icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-slate-800 text-sm truncate mb-0.5">
                  {doc.nombre}
                </h4>
                {doc.caso && <p className="text-[10px] font-bold text-azul-primario uppercase tracking-tighter truncate">{doc.caso}</p>}
                
                <div className="mt-4 flex items-center gap-4 text-[10px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <FiClock size={12} />
                    {doc.fechaSubida}
                  </span>
                  <span>{doc.tamaño}</span>
                </div>
              </div>
            </div>

            {showActions && (
              <div className="mt-5 pt-4 border-t border-slate-50 flex gap-2">
                <button
                  onClick={() => onDescargar(doc)}
                  className="flex-1 py-2.5 bg-slate-50 text-azul-primario rounded-xl font-black text-[11px] flex items-center justify-center gap-2 hover:bg-azul-primario hover:text-white transition-all active:scale-95"
                >
                  <FiDownload size={14} />
                  DESCARGAR
                </button>
                <button
                  onClick={() => onEliminar(doc)}
                  className="w-12 h-[42px] bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                >
                  <FiTrash2 size={16} />
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* VISTA DESKTOP (Tabla) */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-50">
          <thead className="bg-slate-50/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Documento</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"> {documentos[0]?.cliente ? 'Cliente / Caso' : 'Caso'} </th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Subida</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamaño</th>
              {showActions && <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {documentos.map((documento) => (
              <tr key={documento.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {obtenerIconoDocumento(documento.nombre).icon}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-black text-slate-800">{documento.nombre}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black leading-none">{obtenerIconoDocumento(documento.nombre).label}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {documento.cliente && <div className="text-sm font-black text-slate-700">{documento.cliente}</div>}
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
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => onDescargar(documento)}
                        className="w-10 h-10 bg-slate-50 text-azul-primario rounded-xl hover:bg-azul-primario hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm"
                        title="Descargar / Ver"
                      >
                        <FiDownload size={18} />
                      </button>
                      <button
                        onClick={() => onEliminar(documento)}
                        className="w-10 h-10 bg-slate-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all duration-300 flex items-center justify-center shadow-sm"
                        title="Eliminar"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
