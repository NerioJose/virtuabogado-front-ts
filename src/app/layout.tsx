import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import NavBar from '../components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import { DynamicCheckoutWrapper } from '@/features/checkout/DynamicCheckoutWrapper';
import Providers from '@/components/providers/Providers';
import GlobalChatListener from '@/components/chat/GlobalChatListener';
import { Toaster } from 'sonner';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	metadataBase: new URL('https://virtuabogado.app'),
	title: {
		default: 'VirtuAbogado | Asesoría Legal Online Profesional y Confiable',
		template: '%s | VirtuAbogado',
	},
	description: 'Conectamos a clientes con abogados especializados para resolver consultas legales de manera rápida, segura y eficiente. Asesoría jurídica digital a tu alcance.',
	keywords: ['abogado online', 'asesoría legal virtual', 'consultas legales', 'derecho venezuela', 'abogado digital', 'virtuabogado', 'servicios legales online', 'asesoría jurídica'],
	authors: [{ name: 'VirtuAbogado Team' }],
	creator: 'VirtuAbogado',
	publisher: 'VirtuAbogado',
	formatDetection: {
		email: false,
		address: false,
		telephone: false,
	},
	alternates: {
		canonical: '/',
	},
	openGraph: {
		title: 'VirtuAbogado | Asesoría Legal Online Profesional',
		description: 'Resolución de consultas legales con abogados verificados. Rápido, seguro y profesional.',
		url: 'https://virtuabogado.app',
		siteName: 'VirtuAbogado',
		images: [
			{
				url: '/logo/logo_resized.png',
				width: 800,
				height: 600,
				alt: 'VirtuAbogado Logo',
			},
		],
		locale: 'es_ES',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'VirtuAbogado | Asesoría Legal Online',
		description: 'Tu abogado a un click de distancia. Consultas y servicios legales online.',
		images: ['/logo/logo_resized.png'],
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	icons: {
		icon: '/logo/solo_sf_1.png',
		shortcut: '/logo/solo_sf_1.png',
		apple: '/logo/logo_resized.png',
	},
};

const jsonLd = {
	'@context': 'https://schema.org',
	'@type': 'LegalService',
	name: 'VirtuAbogado',
	image: 'https://virtuabogado.app/logo/logo_resized.png',
	'@id': 'https://virtuabogado.app',
	url: 'https://virtuabogado.app',
	telephone: '+58-000-0000000', // Actualizar con el real si es necesario
	address: {
		'@type': 'PostalAddress',
		streetAddress: 'Asesoría Online',
		addressLocality: 'Caracas',
		addressRegion: 'Distrito Capital',
		postalCode: '1010',
		addressCountry: 'VE',
	},
	geo: {
		'@type': 'GeoCoordinates',
		latitude: 10.4806,
		longitude: -66.9036,
	},
	openingHoursSpecification: {
		'@type': 'OpeningHoursSpecification',
		dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
		opens: '00:00',
		closes: '23:59',
	},
	sameAs: [
		'https://www.facebook.com/virtuabogado',
		'https://www.instagram.com/virtuabogado',
		// Agregar redes reales
	],
	priceRange: '$$',
	description: 'Plataforma líder en servicios legales digitales y asesoría jurídica online.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" suppressHydrationWarning>
			<head>
				<link rel="manifest" href="/manifest.json" />
				<meta name="theme-color" content="#0056b3" />
				<link rel="apple-touch-icon" href="/logo/logo_resized.png" />
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}>
				<Providers>
					<GlobalChatListener />
					<NavBar />
					<div className="min-h-screen bg-gradient-to-br from-white to-gray-100 pt-24 overflow-x-hidden">
						<div className="max-w-[2000px] mx-auto px-0">
							{children}
						</div>
					</div>
					<DynamicCheckoutWrapper />
					<Footer />
					<Toaster
						position="bottom-right"
						richColors
						closeButton
						toastOptions={{
							style: { fontFamily: 'var(--font-geist-sans)' },
						}}
					/>
				</Providers>
			</body>
		</html>
	);
}
