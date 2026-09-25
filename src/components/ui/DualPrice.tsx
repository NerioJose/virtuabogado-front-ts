'use client';

import { formatUSD, formatPEN } from '@/lib/finance';
import { usdToPen, penToUsd } from '@/lib/money';
import { useExchangeRate } from '@/features/finance/hooks/useExchangeRate';
import { useDisplaySettings } from '@/features/finance/hooks/useDisplaySettings';

interface DualPriceProps {
    usd: number | string | null | undefined;
    pen?: number | string | null;
    className?: string;
    precision?: number;
}

/**
 * Precio en soles (grande) y dólares (chico, debajo).
 * - `pen` (opcional): precio fijo en soles (canónico) de un servicio cargado en S/.
 *   Si se provee, la línea de soles muestra ESE valor exacto; el dólar mostrado
 *   debe ser el resuelto por el caller (derivado de la misma tasa vigente).
 * - Si `pen` no se provee, el S/ se deriva del USD con la tasa vigente.
 * - Si el admin desactiva "mostrar montos en US$", se muestra solo soles
 *   para TODOS los usuarios (flag global, sincronizado por Supabase Realtime).
 * - Si la tasa no está disponible, muestra solo USD (o el PEN fijo si existe).
 */
export function DualPrice({ usd, pen, className, precision = 2 }: DualPriceProps) {
    const { rate } = useExchangeRate();
    const { showUsd } = useDisplaySettings();
    const numericUsd = typeof usd === 'string' ? parseFloat(usd) : (usd ?? 0);
    const penValue = pen != null && Number(pen) > 0 ? Number(pen) : undefined;
    // Cuando el precio es canónico en soles (penValue), el dólar se deriva de la
    // MISMA tasa vigente para nunca manejar dos tasas distintas.
    const displayUsd = penValue && rate && rate > 0 ? penToUsd(penValue, rate) : numericUsd;

    if (rate && rate > 0) {
        return (
            <span className={`inline-flex flex-col items-start leading-none ${className ?? ''}`}>
                <span className="font-black">{formatPEN(penValue ?? usdToPen(numericUsd, rate), precision)}</span>
                {showUsd && (
                    <span className="text-[0.62em] font-bold opacity-60 mt-0.5">{formatUSD(displayUsd, precision)} USD</span>
                )}
            </span>
        );
    }

    if (penValue) {
        return (
            <span className={`inline-flex flex-col items-start leading-none ${className ?? ''}`}>
                <span className="font-black">{formatPEN(penValue, precision)}</span>
                {showUsd && (
                    <span className="text-[0.62em] font-bold opacity-60 mt-0.5">{formatUSD(numericUsd, precision)} USD</span>
                )}
            </span>
        );
    }

    if (showUsd) {
        return <span className={`font-black ${className ?? ''}`}>{formatUSD(numericUsd, precision)}</span>;
    }

    return <span className={`font-black ${className ?? ''}`} />;
}

export default DualPrice;