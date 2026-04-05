import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/admin/',
					'/abogado/',
					'/api/',
					'/auth/callback',
					'/checkout/',
					'/mis-servicios/',
				],
			},
		],
		sitemap: 'https://virtuabogado.app/sitemap.xml',
	};
}
