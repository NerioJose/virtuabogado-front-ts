import { usdToPen, penToUsd, roundMoney } from '@/lib/money';

export interface PricedService {
    precio?: number | string | null;
    precioPen?: number | string | null;
}

/**
 * Resuelve el precio canónico en USD.
 * - Si el servicio tiene precio fijo en soles (precio_pen), el USD se deriva de la
 *   TASA VIGENTE (una sola tasa, siempre coherente).
 * - Si no, es el precio USD almacenado.
 */
export function resolveServiceUsd(service: PricedService, rate: number): number {
    if (service.precioPen != null && Number(service.precioPen) > 0) {
        return penToUsd(service.precioPen, rate);
    }
    return roundMoney(service.precio);
}

/**
 * Resuelve el precio en soles.
 * - Si el servicio tiene precio fijo en soles (precio_pen), ese es el canónico (exacto).
 * - Si no, se deriva del USD con la TASA VIGENTE.
 */
export function resolveServicePen(service: PricedService, rate: number): number {
    if (service.precioPen != null && Number(service.precioPen) > 0) {
        return roundMoney(service.precioPen);
    }
    return usdToPen(service.precio, rate);
}