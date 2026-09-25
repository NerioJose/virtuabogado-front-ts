import { create } from 'zustand';
import { Service } from '../types/services.types';

interface ServicesState {
    services: Service[];
    activeServices: Service[];
    setServices: (services: Service[]) => void;
    updateServiceState: (id: number, updates: Partial<Service>) => void;
}

/**
 * Store SOLO en memoria (sin persist en localStorage).
 *
 * Se llena exclusivamente desde la query en vivo del API (que siempre incluye
 * el precio canónico `precioPen`). No persiste copias para que ningún snapshot
 * viejo (sin `precioPen` o con campos faltantes) pueda pintar precios derivados
 * artefactuales (.01) antes del primer refetch.
 */
export const useServicesStore = create<ServicesState>()(
    (set) => ({
        services: [],
        activeServices: [],
        setServices: (services) => set({
            services,
            activeServices: services.filter(s => s.activo)
        }),
        updateServiceState: (id, updates) => set((state) => {
            const exists = state.services.some(s => s.id === id);
            let newServices: Service[];
            if (exists) {
                // Update in place
                newServices = state.services.map(s =>
                    s.id === id ? { ...s, ...updates } : s
                );
            } else {
                // Upsert: add the service if it wasn't in the array
                newServices = [...state.services, { id, ...updates } as Service];
            }
            return {
                services: newServices,
                activeServices: newServices.filter(s => s.activo)
            };
        }),
    })
);