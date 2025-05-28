'use client';

import HeroSection from '@/components/homePage/HeroSection';
import ServiciosDestacados from '@/components/homePage/ServiciosDestacados';
import SectionTestimonios from '@/components/homePage/SeccionTestimonios';
import CallToAction from '@/components/homePage/CallToAction';

export default function HomePage() {
	return (
		<main className="min-h-screen">
			{/* Hero Section */}
			<HeroSection />

			{/* Servicios Destacados */}
			<ServiciosDestacados />

			{/* Sección de Testimonios */}
			<SectionTestimonios />

			{/* Call to Action */}
			<CallToAction />
		</main>
	);
}
