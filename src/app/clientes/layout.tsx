import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
    title: 'Nuestros Clientes | VirtuAbogado',
    description: 'Conoce las historias de éxito de nuestros clientes. Casos reales de asesoría legal online profesional y confiable.',
    alternates: { canonical: 'https://virtuabogado.app/clientes' },
    openGraph: {
        title: 'Nuestros Clientes | VirtuAbogado',
        description: 'Casos de éxito de VirtuAbogado.',
        url: 'https://virtuabogado.app/clientes',
    },
};

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <BreadcrumbSchema items={[
                { name: 'Inicio', url: '/' },
                { name: 'Nuestros Clientes', url: '/clientes' },
            ]} />
        </>
    );
}
