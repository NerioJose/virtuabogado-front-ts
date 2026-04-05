import type { Metadata } from 'next';
import HeroSection from '@/components/homePage/HeroSection';
import ServiciosDestacados from '@/components/homePage/ServiciosDestacados';
import VirtuStudents from '@/components/homePage/VirtuStudents';
import SectionTestimonios from '@/components/homePage/SeccionTestimonios';
import CallToAction from '@/components/homePage/CallToAction';

export const metadata: Metadata = {
	title: 'Inicio | Asesoría Legal Profesional Online',
	description: 'Bienvenido a VirtuAbogado. Conectamos tus necesidades legales con los mejores abogados especializados. Consultas rápidas, seguras y profesionales.',
	alternates: {
		canonical: 'https://virtuabogado.app',
	},
};

export default function HomePage() {
	return (
		<main className="min-h-screen">
			{/* Hero Section */}
			<HeroSection />

			{/* Servicios Destacados */}
			<ServiciosDestacados />

			{/* Sección VirtuStudents */}
			<VirtuStudents />

			{/* Sección de Testimonios */}
			<SectionTestimonios />

			{/* Call to Action */}
			<CallToAction />
		</main>
	);
}
