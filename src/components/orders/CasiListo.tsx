'use client';

import React from 'react';
import Link from 'next/link';
import { FiClock } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface CasiListoProps {
    orderId: string | number;
}

export const CasiListo: React.FC<CasiListoProps> = ({ orderId }) => {
    return (
        <main className="min-h-[70vh] bg-white py-12 px-4 flex items-center justify-center">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full bg-white p-8 rounded-3xl shadow-2xl border border-gray-100 text-center"
            >
                <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8 border-2 border-amber-100 shadow-inner">
                    <FiClock className="text-amber-500 animate-pulse" size={48} />
                </div>
                
                <h2 className="text-3xl font-black text-azul-primario mb-4 tracking-tight">
                    Casi listo...
                </h2>
                
                <p className="text-gray-600 mb-8 leading-relaxed text-lg font-medium">
                    Estamos esperando la confirmación de tu pago. En cuanto la red lo valide, habilitaremos tu panel completo y el acceso a tus servicios legales.
                </p>
                
                <div className="flex flex-col gap-4">
                    <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-left">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-2">
                            Referencia de Orden
                        </p>
                        <p className="font-mono text-sm text-azul-primario font-bold break-all">
                            {orderId}
                        </p>
                    </div>
                    
                    <Link 
                        href="/mis-servicios" 
                        className="bg-azul-primario hover:bg-azul-claro text-white font-bold py-4 px-6 rounded-2xl transition shadow-lg hover:shadow-xl active:scale-95 text-center"
                    >
                        Ir a Mis Servicios
                    </Link>
                    
                    <p className="text-xs text-gray-400 mt-2 italic">
                        La confirmación suele tardar unos minutos dependiendo de la red.
                    </p>
                </div>
            </motion.div>
        </main>
    );
};
