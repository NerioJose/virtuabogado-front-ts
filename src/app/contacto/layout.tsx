import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
    title: 'Contáctanos | VirtuAbogado',
    description: 'Comunícate con VirtuAbogado. Estamos en Carabobo, Venezuela. Envíanos un mensaje y te responderemos lo antes posible.',
    alternates: { canonical: 'https://virtuabogado.app/contacto' },
    openGraph: {
        title: 'Contáctanos | VirtuAbogado',
        description: 'Comunícate con VirtuAbogado. Estamos en Carabobo, Venezuela.',
        url: 'https://virtuabogado.app/contacto',
    },
};

export default function ContactoLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <BreadcrumbSchema items={[
                { name: 'Inicio', url: '/' },
                { name: 'Contáctanos', url: '/contacto' },
            ]} />
        </>
    );
}
