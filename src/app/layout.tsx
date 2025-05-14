import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import NavBar from '../components/NavBar'; // Asegúrate de que la ruta sea correcta
import Footer from '@/components/Footer';
import AbandonedCartReminder from '../components/AbandonedCartReminder';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'VirtuAbogado',
	description: 'Asesorias online en Derecho',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}>
				<NavBar />
				<div className="min-h-screen bg-gradient-to-br from-white to-gray-100 pt-24">
					{' '}
					{/* Cambiar pt-16 a pt-24 */}
					{children}
					<AbandonedCartReminder />
				</div>
				<Footer />
			</body>
		</html>
	);
}
