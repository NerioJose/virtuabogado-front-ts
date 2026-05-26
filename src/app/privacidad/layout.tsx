import type { Metadata } from 'next';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export const metadata: Metadata = {
    title: 'Política de Privacidad | VirtuAbogado',
    description: 'Lee nuestra política de privacidad para entender cómo protegemos tus datos personales en VirtuAbogado.',
    alternates: { canonical: 'https://virtuabogado.app/privacidad' },
    openGraph: {
        title: 'Política de Privacidad | VirtuAbogado',
        description: 'Política de privacidad de VirtuAbogado.',
        url: 'https://virtuabogado.app/privacidad',
    },
};

export default function PrivacidadLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <BreadcrumbSchema items={[
                { name: 'Inicio', url: '/' },
                { name: 'Política de Privacidad', url: '/privacidad' },
            ]} />
        </>
    );
}
