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
                const newServices = state.services.map(s => 
                    s.id === id ? { ...s, ...updates } : s
                );
                return {
                    services: newServices,
                    activeServices: newServices.filter(s => s.activo)
                };
            }),
        }),
        {
            name: 'virtu-services-storage',
        }
    )
);
