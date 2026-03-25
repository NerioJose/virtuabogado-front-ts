import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Service } from '../types/services.types';

interface ServicesState {
    services: Service[];
    activeServices: Service[];
    setServices: (services: Service[]) => void;
    updateServiceState: (id: number, updates: Partial<Service>) => void;
}

export const useServicesStore = create<ServicesState>()(
    persist(
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
        }),
        {
            name: 'virtu-services-storage',
            version: 2, // Force clear stale localStorage
        }
    )
);
