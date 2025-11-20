'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FiXCircle, FiHome, FiRefreshCw } from 'react-icons/fi';
import { Suspense } from 'react';

function ErrorPagoContent() {
  const searchParams = useSearchParams();
  const motivo = searchParams.get('motivo') || 'No se pudo procesar el pago';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-white px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiXCircle className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Error en el pago
          </h1>
          <p className="text-gray-600">{motivo}</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/pago"
            className="flex items-center justify-center gap-2 w-full bg-azul-primario text-white px-6 py-3 rounded-lg hover:bg-azul-primario/90 transition-colors">
            <FiRefreshCw />
            Intentar de nuevo
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors">
            <FiHome />
            Volver al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

export default function ErrorPagoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <ErrorPagoContent />
    </Suspense>
  );
}