'use client';

import HeroSection from '@/components/nosotros/HeroSection';
import NuestraHistoriaSection from '@/components/nosotros/NuestraHistoriaSection';
import MisionVisionSection from '@/components/nosotros/MisionVisionSection';
import NuestroEquipoSection from '@/components/nosotros/NuestroEquipoSection';
import ValoresSection from '@/components/nosotros/ValoresSection';
import CTASection from '@/components/nosotros/CTASection';

export default function NosotrosPage() {
	return (
		<main className="min-h-screen">
			{/* Hero Section */}
			<HeroSection />

			{/* Nuestra Historia */}
			<NuestraHistoriaSection />

			{/* Misión y Visión */}
			<MisionVisionSection />

			{/* Nuestro Equipo */}
			<NuestroEquipoSection />

			{/* Valores */}
			<ValoresSection />

			{/* CTA Section */}
			<CTASection />
		</main>
	);
}
