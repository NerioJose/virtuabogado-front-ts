'use client';

import React from 'react';
import { FiFile, FiFileText } from 'react-icons/fi';
import { DocumentoItem } from '../components/DocumentList';

export function useDocumentListViewModel() {
  
  const obtenerIconoDocumento = (nombre: string) => {
    const extension = nombre.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      return { 
          icon: <FiFileText className="text-red-500" />,
          color: 'text-red-500',
          label: 'PDF Documento'
      };
    } else if (extension === 'docx' || extension === 'doc') {
      return { 
          icon: <FiFileText className="text-blue-500" />,
          color: 'text-blue-500',
          label: 'Word Documento'
      };
    } else if (extension === 'xlsx' || extension === 'xls') {
      return { 
          icon: <FiFileText className="text-green-500" />,
          color: 'text-green-500',
          label: 'Excel Documento'
      };
    } else {
      return { 
          icon: <FiFile className="text-gray-500" />,
          color: 'text-gray-500',
          label: 'Documento'
      };
    }
  };

  return {
    obtenerIconoDocumento
  };
}
