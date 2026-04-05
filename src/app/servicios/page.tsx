import type { Metadata } from 'next';
import ServiciosClientPage from './ServiciosClientPage';

export const metadata: Metadata = {
	title: 'Nuestros Servicios Legales',
	description: 'Explora nuestra amplia gama de servicios legales online: desde consultas generales hasta representación legal especializada. Calidad y confianza a tu alcance.',
	alternates: {
		canonical: 'https://virtuabogado.app/servicios',
	},
};

export default function ServiciosPage() {
	return <ServiciosClientPage />;
}
