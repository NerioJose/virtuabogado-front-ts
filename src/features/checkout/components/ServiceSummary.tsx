import React from 'react';
import Image from 'next/image';
import type { Servicio } from '@/shared/types/entities.types';
import { FiClock, FiDollarSign, FiInfo } from 'react-icons/fi';
import { DualPrice } from '@/components/ui/DualPrice';
import { useFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';
import { useCheckoutStore } from '../store/checkoutStore';

interface ServiceSummaryProps {
    service: Servicio;
}

export const ServiceSummary: React.FC<ServiceSummaryProps> = ({ service }) => {
    const { data: settings } = useFinancialSettings();
    const isCrypto = useCheckoutStore((state) => state.selectedMethod === 'zenobank');

    // Cálculo del desglose (Impuestos Incluidos)
    const taxPercentage = (settings as any)?.taxPercentage || 0;
    const total = Number(service.precio) || 0;
    const basePrice = total / (1 + (taxPercentage / 100));
    const taxAmount = total - basePrice;

    // Al pagar con cripto, TODO se muestra solo en dólares (monto exacto con decimales),
    // sin soles, para que el cliente transfiera el monto exacto a la plataforma.
    const Money: React.FC<{ value: number; className?: string }> = ({ value, className }) => {
        if (isCrypto) {
            return <span className={className}>US$ {(Number(value) || 0).toFixed(2)}</span>;
        }
        return <DualPrice usd={value} className={className} />;
    };

    return (
        <div className="bg-azul-claro/10 rounded-2xl p-5 mb-8 border border-azul-claro/20">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-[11px] font-black text-azul-primario uppercase tracking-widest flex items-center gap-2">
                    <FiInfo className="text-azul-primario/50" /> Resumen del Servicio
                </h3>
            </div>

            <div className="flex gap-5 mb-5">
                {service.imagen && (
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-2xl overflow-hidden shadow-sm border border-white">
                        <Image
                            src={service.imagen}
                            alt={service.nombre || service.titulo || 'Servicio legal'}
                            fill
                            className="object-cover"
                        />
                    </div>
                )}
                <div className="flex-1">
                    <h4 className="font-bold text-gray-900 leading-tight mb-1">
                        {service.nombre || service.titulo}
                    </h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed italic mb-2">
                        "{service.descripcion}"
                    </p>
                    {service.duracion && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                            <FiClock className="w-3.5 h-3.5" />
                            <span>Tiempo est.: {service.duracion}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Desglose Financiero Maestro */}
            <div className="border-t border-dashed border-azul-primario/10 pt-4 space-y-2">
                <div className="flex justify-between items-center text-[11px] font-medium text-gray-500">
                    <span className="italic">Base del Servicio:</span>
                    <span className="font-bold"><Money value={basePrice} /></span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-medium text-gray-400">
                    <span className="italic">Impuestos (IVA {taxPercentage}%):</span>
                    <span className="font-bold text-azul-primario/60"><Money value={taxAmount} /></span>
                </div>
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-azul-primario/5">
                    <span className="text-xs font-black text-azul-primario uppercase tracking-widest">Importe Final:</span>
                    <div className="text-xl font-black text-azul-primario tracking-tighter">
                        <Money value={total} />
                    </div>
                </div>
                {isCrypto && (
                    <div className="flex items-center gap-1.5 pt-2 mt-1 border-t border-dashed border-amber-200 text-[9px] font-black text-amber-700 uppercase tracking-wider">
                        <FiDollarSign /> Pago en criptomonedas: transfiere el monto exacto en dólares (USD)
                    </div>
                )}
            </div>
        </div>
    );
};
