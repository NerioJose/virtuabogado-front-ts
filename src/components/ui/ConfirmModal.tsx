'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiAlertTriangle, FiCheck, FiInfo } from 'react-icons/fi';
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
  showCancel?: boolean;
  variant?: 'danger' | 'success' | 'info';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  showCancel = true,
  variant = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const themes = {
    danger: {
      icon: <FiAlertTriangle className="w-5 h-5 text-red-600" />,
      iconBg: 'bg-red-100',
      btnBg: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    success: {
      icon: <FiCheck className="w-5 h-5 text-green-600" />,
      iconBg: 'bg-green-100',
      btnBg: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
    },
    info: {
      icon: <FiInfo className="w-5 h-5 text-azul-primario" />,
      iconBg: 'bg-blue-100',
      btnBg: 'bg-azul-primario hover:bg-azul-oscuro focus:ring-azul-primario',
    }
  };

  const theme = themes[variant];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50">
                <div className="flex items-center space-x-3">
                    <div className={`flex items-center justify-center w-10 h-10 ${theme.iconBg} rounded-full`}>
                        {theme.icon}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                </div>
                <button type="button"
                    onClick={onClose}
                    className="p-2 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-600 transition focus:outline-none"
                    aria-label="Cerrar modal"
                    disabled={isLoading}
                >
                    <FiX className="w-5 h-5" />
                </button>
            </div>

            {/* Body */}
            <div className="px-8 py-8 text-center sm:text-left">
                <div className="text-gray-600 font-medium leading-relaxed">
                    {message}
                </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-end px-6 py-5 space-y-2 sm:space-y-0 sm:space-x-3 bg-gray-50/50 border-t border-gray-100">
                {showCancel && (
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className={`w-full sm:w-auto px-8 py-2.5 text-sm font-bold text-white transition ${theme.btnBg} rounded-xl shadow-lg shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {isLoading ? 'Procesando...' : confirmText}
                </button>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
