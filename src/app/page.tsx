import type { Metadata } from 'next';
import HeroSection from '@/components/homePage/HeroSection';
import ServiciosDestacados from '@/components/homePage/ServiciosDestacados';
import VirtuStudents from '@/components/homePage/VirtuStudents';
import SectionTestimonios from '@/components/homePage/SeccionTestimonios';
import CallToAction from '@/components/homePage/CallToAction';
import { QueryClient, dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { prisma } from '@/lib/prisma';


export const metadata: Metadata = {
	title: 'Inicio | Asesoría Legal Profesional Online',
	description: 'Bienvenido a VirtuAbogado. Conectamos tus necesidades legales con los mejores abogados especializados. Consultas rápidas, seguras y profesionales.',
	alternates: {
		canonical: 'https://virtuabogado.app',
	},
};

// Revalidación cada 1 hora para el Home
export const revalidate = 3600;

export default async function HomePage() {
    const queryClient = new QueryClient();

    // Pre-fetch de servicios para que todo el Home cargue sin loaders
    await queryClient.prefetchQuery({
        queryKey: ['Service', 'active'],
        queryFn: async () => {
            const data = await prisma.service.findMany({
                where: { activo: true },
                orderBy: { id: 'asc' }
            });
            return data.map(s => ({ ...s, precio: Number(s.precio) }));
        }
    });

	return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <main className="min-h-screen">
                <HeroSection />
                <ServiciosDestacados />
                <VirtuStudents />
                <SectionTestimonios />
                <CallToAction />
            </main>
        </HydrationBoundary>
	);
}
