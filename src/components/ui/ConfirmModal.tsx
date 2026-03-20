import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle } from 'react-icons/fi';
import { ReactNode } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-50">
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden"
        >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                        <FiAlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-lg font-medium text-gray-900">{title}</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-gray-400 rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-azul-primario"
                    aria-label="Cerrar modal"
                    disabled={isLoading}
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>
            <div className="px-6 py-6">
                <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
            </div>
            <div className="flex items-center justify-end px-6 py-4 space-x-3 bg-gray-50 border-t border-gray-200">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario disabled:opacity-50"
                >
                    {cancelText}
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white transition-colors bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Procesando...' : confirmText}
                </button>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
