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

export interface PricePair {
    usd: number;
    pen: number | null;
}

/**
 * RESOLVER ÚNICO DE PRECIO (fuente única de verdad para el display).
 *
 * Devuelve el par canónico coherente { usd, pen }:
 * - Si el servicio tiene PEN canónico (precio_pen > 0), ese es el SOL exacto y
 *   el USD se deriva con la TASA VIGENTE (una sola tasa, nunca dos).
 * - Si no, el USD es el almacenado y el SOL se deriva con la tasa vigente.
 *
 * Todo componente que muestre un precio debe pasar por aquí (o por
 * resolveServiceBreakdown) para que nunca se derive más de una vez.
 */
export function resolveServicePrice(service: PricedService, rate: number): PricePair {
    if (service.precioPen != null && Number(service.precioPen) > 0) {
        const pen = roundMoney(Number(service.precioPen));
        return { usd: penToUsd(pen, rate), pen };
    }
    const usd = roundMoney(Number(service.precio) || 0);
    return { usd, pen: rate > 0 ? usdToPen(usd, rate) : null };
}

/**
 * Escala AMBAS monedas por el mismo factor manteniendo la coherencia
 * (usa roundMoney en las dos para no reintroducir artefactos de redondeo).
 */
export function scalePrice(pair: PricePair, factor: number): PricePair {
    return {
        usd: roundMoney(pair.usd * factor),
        pen: pair.pen != null ? roundMoney(pair.pen * factor) : null,
    };
}

/**
 * Desglose coherente del checkout: base, impuestos y total derivan del MISMO
 * par canónico escalado — es imposible que las líneas diverjan (p. ej. el .01).
 */
export function resolveServiceBreakdown(
    service: PricedService,
    rate: number,
    taxPercentage: number
): { base: PricePair; tax: PricePair; total: PricePair } {
    const total = resolveServicePrice(service, rate);
    const factor = 1 / (1 + (taxPercentage || 0) / 100);
    const base = scalePrice(total, factor);
    const tax: PricePair = {
        usd: roundMoney(total.usd - base.usd),
        pen: base.pen != null && total.pen != null ? roundMoney(total.pen - base.pen) : null,
    };
    return { base, tax, total };
}