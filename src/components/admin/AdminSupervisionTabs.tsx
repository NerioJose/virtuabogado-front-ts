'use client';

import React, { useState, useEffect } from 'react';
import { FiBriefcase, FiMessageSquare, FiFileText } from 'react-icons/fi';
import { ChatWindow as ChatWindowSupervision } from '@/features/chat/components/ChatWindow';
import DocumentList, { DocumentoItem } from '@/features/documents/components/DocumentList';
import { capitalizeName } from '@/utils/formatters';

interface AdminSupervisionTabsProps {
  orderId: string;
  elemento: any;
}

export default function AdminSupervisionTabs({ orderId, elemento }: AdminSupervisionTabsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'chat' | 'docs'>('info');
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchDocumentos = async () => {
    try {
      setLoadingDocs(true);
      const response = await fetch(`/api/documents?orderId=${orderId}`);
      const docs = await response.json();
      
      if (Array.isArray(docs)) {
        const mappedDocs: DocumentoItem[] = docs.map((d: any) => ({
          id: d.id,
          nombre: d.name || 'Sin nombre',
          tipo: d.type || 'Documento',
          caso: d.order ? `${d.order.service?.titulo || 'Servicio'} (#${d.order.numericId || '?'})` : undefined,
          cliente: d.order?.user?.nombre ? capitalizeName(d.order.user.nombre) : 'Desconocido',
          fechaSubida: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : 'N/A',
          tamaño: d.size ? `${(d.size / 1024 / 1024).toFixed(2)} MB` : 'N/A',
          url: d.url || '#'
        }));
        setDocumentos(mappedDocs);
      }
    } catch (error) {
      console.error('Error fetching docs for admin:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'docs') {
      fetchDocumentos();
    }
  }, [activeTab, orderId]);

  return (
    <div className="mt-8 border-t pt-6">
      {/* Tab Switcher Professional */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8 w-fit mx-auto border border-slate-200">
        <button type="button"
          onClick={() => setActiveTab('info')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition ${
            activeTab === 'info' ? 'bg-white text-azul-primario shadow-md' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FiBriefcase size={14} />
          Servicios
        </button>
        <button type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition ${
            activeTab === 'chat' ? 'bg-white text-azul-primario shadow-md' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FiMessageSquare size={14} />
          Chat
        </button>
        <button type="button"
          onClick={() => setActiveTab('docs')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition ${
            activeTab === 'docs' ? 'bg-white text-azul-primario shadow-md' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FiFileText size={14} />
          Documentos
        </button>
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'info' && (
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h4 className="font-black text-azul-primario mb-4 flex items-center uppercase text-xs tracking-widest">
              Contenido Legal del Caso
            </h4>
            <div className="space-y-3">
              {elemento?.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                  <div>
                    <span className="text-sm font-black text-slate-800 block">{item.serviceName || 'Servicio Legal'}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Vigencia Ilimitada</span>
                  </div>
                  <span className="text-sm font-black text-azul-primario">${(item.price || 0).toLocaleString()}</span>
                </div>
              ))}
              {!elemento?.items?.length && (
                <p className="text-sm text-slate-500 italic text-center py-4">No hay items registrados para este pedido.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="space-y-4">
             <h4 className="font-black text-slate-800 mb-3 flex items-center uppercase text-xs tracking-widest">
               Supervisión de Mensajería
             </h4>
             <div className="h-[550px] shadow-2xl rounded-3xl overflow-hidden border border-slate-200">
                <ChatWindowSupervision orderId={orderId} className="h-full" />
             </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-4 min-h-[400px]">
            <h4 className="font-black text-slate-800 mb-3 flex items-center uppercase text-xs tracking-widest">
               Expediente Digital Consolidado
            </h4>
            {loadingDocs ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-10 h-10 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <DocumentList 
                documentos={documentos}
                onDescargar={(doc) => window.open(doc.url, '_blank')}
                onEliminar={async (doc) => {
                    if (confirm(`¿Eliminar documento "${doc.nombre}"?`)) {
                        try {
                            const res = await fetch(`/api/documents?id=${doc.id}`, { method: 'DELETE' });
                            if (res.ok) fetchDocumentos();
                            else alert('Error al eliminar el documento');
                        } catch {
                            alert('Error al eliminar el documento');
                        }
                    }
                }}
                showActions={true} // Permits downloading
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
