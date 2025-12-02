import React from 'react';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiX } from 'react-icons/fi';

interface ErrorMessageProps {
    message: string;
    onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onDismiss }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
        >
            <div className="flex items-start gap-3">
                <FiAlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <p className="text-sm text-red-800">{message}</p>
                </div>
                {onDismiss && (
                    <button
                        onClick={onDismiss}
                        className="text-red-600 hover:text-red-800 transition-colors"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                )}
            </div>
        </motion.div>
    );
};
