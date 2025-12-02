import React from 'react';
import { motion } from 'framer-motion';

interface LoadingOverlayProps {
    message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    message = 'Procesando...'
}) => {
    return (
        <div className="absolute inset-0 bg-white/95 flex items-center justify-center z-50 rounded-lg">
            <div className="text-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-12 h-12 border-4 border-azul-claro border-t-azul-primario rounded-full mx-auto mb-4"
                />
                <p className="text-gray-600 font-medium">{message}</p>
            </div>
        </div>
    );
};
