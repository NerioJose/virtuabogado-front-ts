import type { Metadata } from 'next';
import ServiciosClientPage from './ServiciosClientPage';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { prisma } from '@/lib/prisma';
import { servicesKeys } from '@/features/services/hooks/useServices';

export const metadata: Metadata = {
	title: 'Nuestros Servicios Legales',
	description: 'Explora nuestra amplia gama de servicios legales online: desde consultas generales hasta representación legal especializada. Calidad y confianza a tu alcance.',
	alternates: {
		canonical: 'https://virtuabogado.app/servicios',
	},
};

// Forzar revalidación cada hora para mantener datos frescos sin saturar el servidor
export const revalidate = 3600;

export default async function ServiciosPage() {
    const queryClient = new QueryClient();

    // Pre-fetch de servicios directamente desde la DB en el servidor
    await queryClient.prefetchQuery({
        queryKey: servicesKeys.active,
        queryFn: async () => {
            const data = await prisma.service.findMany({
                where: { activo: true },
                orderBy: { id: 'asc' }
            });
            // Convertir Decimal a Number para compatibilidad con JSON
            return data.map(s => ({ ...s, precio: Number(s.precio) }));
        }
    });

	return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <ServiciosClientPage />
        </HydrationBoundary>
    );
}
