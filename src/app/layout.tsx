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
	title: 'VirtuAbogado',
	description: 'Asesorias online en Derecho',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" suppressHydrationWarning>
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
