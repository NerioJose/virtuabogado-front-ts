import { serializeFinance } from '@/lib/finance';
import { Service } from '../types/services.types';

/**
 * Fuente única de la "forma" con la que un servicio llega al CLIENTE.
 *
 * `/api/services`, los prefetch SSR (`/`, `/servicios`) y el realtime deben
 * producir EXACTAMENTE la misma forma. Si no, el primer render (dato hidratado
 * pen-less) pinta un precio derivado artefactual (.01) hasta que el refetch del
 * API lo corrige. Este mapper garantiza que siempre exista `precioPen` numérico
 * (o `null`).
 */

interface ServiceRowLike {
    precio_pen?: unknown;
    precioPen?: unknown;
    id?: unknown;
    titulo?: unknown;
    descripcion?: unknown;
    precio?: unknown;
    imagenUrl?: unknown;
    activo?: unknown;
    [key: string]: unknown;
}

export const toServiceJson = (service: ServiceRowLike): Service => {
    const ser = serializeFinance(service);
    const penRaw = (ser as ServiceRowLike).precioPen ?? (ser as ServiceRowLike).precio_pen;
    return {
        ...ser,
        id: Number(service.id),
        precio: Number(service.precio) || 0,
        precioPen: penRaw != null && !Number.isNaN(Number(penRaw)) ? Number(penRaw) : null,
    } as Service;
};

/**
 * Normalización defensiva a la forma `Service` del store. Se aplica en
 * `useServices`/`useAdminServices` antes de `setServices`, para que ninguna
 * fuente (prefetch, API, realtime, invalidaciones) pueda colar una fila sin
 * `precioPen` numérico.
 */
export const normalizeService = (raw: ServiceRowLike): Service => {
    const row = raw ?? {};
    return {
        id: Number(row.id),
        titulo: (row.titulo as string) ?? '',
        descripcion: (row.descripcion as string) ?? '',
        precio: Number(row.precio) || 0,
        precioPen: (() => {
            const pen = row.precioPen ?? row.precio_pen;
            return pen != null && !Number.isNaN(Number(pen)) ? Number(pen) : null;
        })(),
        imagenUrl: (row.imagenUrl as string | null) ?? null,
        activo: (row.activo as boolean) ?? true,
    };
};
