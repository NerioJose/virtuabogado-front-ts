import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = 'https://virtuabogado.app';

	// Rutas estáticas principales
	const routes = [
		'',
		'/servicios',
		'/nosotros',
		'/contacto',
		'/privacidad',
		'/terminos',
	].map(route => ({
		url: `${baseUrl}${route}`,
		lastModified: new Date().toISOString(),
		changeFrequency: 'monthly' as const,
		priority: route === '' ? 1 : 0.8,
	}));

	return routes;
}
