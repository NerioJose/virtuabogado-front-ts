'use client';

import { formatUSD, formatPEN, usdToPen } from '@/lib/finance';
import { useExchangeRate } from '@/features/finance/hooks/useExchangeRate';
import { useDisplaySettings } from '@/features/finance/hooks/useDisplaySettings';

interface DualPriceProps {
    usd: number | string | null | undefined;
    className?: string;
    precision?: number;
}

/**
 * Precio en soles (grande) y dólares (chico, debajo).
 * Si el admin desactiva "mostrar montos en US$", se muestra solo soles
 * para TODOS los usuarios (flag global, sincronizado por Supabase Realtime).
 * Si la tasa no está disponible, muestra solo USD.
 */
export function DualPrice({ usd, className, precision = 2 }: DualPriceProps) {
    const { rate } = useExchangeRate();
    const { showUsd } = useDisplaySettings();
    const numericUsd = typeof usd === 'string' ? parseFloat(usd) : (usd ?? 0);

    if (rate && rate > 0) {
        return (
            <span className={`inline-flex flex-col items-start leading-none ${className ?? ''}`}>
                <span className="font-black">{formatPEN(usdToPen(numericUsd, rate), precision)}</span>
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
