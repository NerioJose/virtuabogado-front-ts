import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
    title: 'Términos y Condiciones | VirtuAbogado',
    description: 'Conoce los términos y condiciones de uso de la plataforma VirtuAbogado.',
    alternates: { canonical: 'https://virtuabogado.app/terminos' },
    openGraph: {
        title: 'Términos y Condiciones | VirtuAbogado',
        description: 'Términos y condiciones de VirtuAbogado.',
        url: 'https://virtuabogado.app/terminos',
    },
};

export default function TerminosLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <BreadcrumbSchema items={[
                { name: 'Inicio', url: '/' },
                { name: 'Términos y Condiciones', url: '/terminos' },
            ]} />
        </>
    );
}
