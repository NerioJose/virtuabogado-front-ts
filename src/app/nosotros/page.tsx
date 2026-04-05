import type { Metadata } from 'next';
import HeroSection from '@/components/nosotros/HeroSection';
import NuestraHistoriaSection from '@/components/nosotros/NuestraHistoriaSection';
import MisionVisionSection from '@/components/nosotros/MisionVisionSection';
import ValoresSection from '@/components/nosotros/ValoresSection';
import CTASection from '@/components/nosotros/CTASection';

export const metadata: Metadata = {
	title: 'Sobre Nosotros | Nuestra Historia y Valores',
	description: 'Conoce la historia detrás de VirtuAbogado, nuestra misión de democratizar el acceso legal y los valores que nos definen como líderes en asesoría jurídica digital.',
	alternates: {
		canonical: 'https://virtuabogado.app/nosotros',
	},
};

export default function NosotrosPage() {
	return (
		<main className="min-h-screen">
			{/* Hero Section */}
			<HeroSection />

			{/* Nuestra Historia */}
			<NuestraHistoriaSection />

			{/* Misión y Visión */}
			<MisionVisionSection />

			{/* Valores */}
			<ValoresSection />

			{/* CTA Section */}
			<CTASection />
		</main>
	);
}
