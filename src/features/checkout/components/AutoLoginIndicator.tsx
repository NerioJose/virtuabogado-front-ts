import React from 'react';
import { motion } from 'framer-motion';
import { FiCheckCircle } from 'react-icons/fi';

interface AutoLoginIndicatorProps {
    userName: string;
}

export const AutoLoginIndicator: React.FC<AutoLoginIndicatorProps> = ({ userName }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4"
        >
            <div className="flex items-center gap-2">
                <FiCheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm text-green-800">
                    ¡Bienvenido de vuelta, <span className="font-semibold">{userName}</span>!
                </p>
            </div>
        </motion.div>
    );
};
