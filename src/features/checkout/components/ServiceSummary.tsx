import React from 'react';
import Image from 'next/image';
import type { Servicio } from '@/shared/types/entities.types';
import { FiClock, FiDollarSign } from 'react-icons/fi';
import { formatUSD } from '@/lib/finance';

interface ServiceSummaryProps {
    service: Servicio;
}

export const ServiceSummary: React.FC<ServiceSummaryProps> = ({ service }) => {
    return (
        <div className="bg-azul-claro/10 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-azul-primario mb-3">
                Resumen del Servicio
            </h3>
            <div className="flex gap-4">
                {service.imagen && (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                            src={service.imagen}
                            alt={service.nombre || service.titulo || 'Servicio legal'}
                            fill
                            className="object-cover"
                        />
                    </div>
                )}
                <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">
                        {service.nombre || service.titulo}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {service.descripcion}
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                        {service.duracion && (
                            <div className="flex items-center gap-1 text-gray-600">
                                <FiClock className="w-4 h-4" />
                                <span>{service.duracion}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-1 text-azul-primario font-semibold">
                            <FiDollarSign className="w-4 h-4" />
                            <span>{formatUSD(service.precio)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
