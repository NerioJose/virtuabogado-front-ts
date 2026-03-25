import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const existing = await prisma.service.count();
        if (existing > 0) {
            return NextResponse.json({ message: 'Database already has services' });
        }

        const servicios = [
            {
                id: 1,
                titulo: 'Consultas Legales',
                descripcion: 'Resuelve tus dudas legales con abogados especializados en diferentes áreas del derecho. Nuestros profesionales te brindarán asesoramiento claro y preciso para ayudarte a tomar las mejores decisiones.',
                precio: 99.99,
                imagenUrl: '/images/consulta-legal.jpg',
                activo: true
            },
            {
                id: 2,
                titulo: 'Revisión de Documentos',
                descripcion: 'Análisis y revisión de contratos, acuerdos y documentos legales por profesionales. Asegúrate de que tus documentos cumplan con todos los requisitos legales y protejan tus intereses.',
                precio: 149.99,
                imagenUrl: '/images/revision-documentos.jpg',
                activo: true
            },
            {
                id: 3,
                titulo: 'Representación Legal',
                descripcion: 'Representación profesional en procesos judiciales y extrajudiciales. Nuestros abogados te acompañarán en cada etapa del proceso, defendiendo tus derechos e intereses con dedicación y profesionalismo.',
                precio: 299.99,
                imagenUrl: '/images/representacion-legal.jpg',
                activo: true
            },
            {
                id: 4,
                titulo: 'Asesoría Empresarial',
                descripcion: 'Servicios legales especializados para empresas y emprendedores. Desde la constitución de sociedades hasta la resolución de conflictos comerciales, te brindamos el apoyo legal que tu negocio necesita.',
                precio: 199.99,
                imagenUrl: '/images/asesoria-empresarial.jpg',
                activo: true
            },
            {
                id: 5,
                titulo: 'Derecho Familiar',
                descripcion: 'Asesoramiento en asuntos de familia como divorcios, custodia, pensiones alimenticias y más. Abordamos estos temas sensibles con empatía y profesionalismo, buscando siempre las mejores soluciones para todas las partes involucradas.',
                precio: 179.99,
                imagenUrl: '/images/derecho-familiar.jpg',
                activo: true
            },
            {
                id: 6,
                titulo: 'Derecho Inmobiliario',
                descripcion: 'Servicios legales relacionados con propiedades, compraventas, arrendamientos y conflictos inmobiliarios. Te ayudamos a proteger tus inversiones y a resolver cualquier problema legal relacionado con bienes raíces.',
                precio: 249.99,
                imagenUrl: '/images/derecho-inmobiliario.jpg',
                activo: true
            }
        ];

        // Usamos createMany para eficiencia
        await prisma.service.createMany({
            data: servicios.map(s => ({
                id: s.id,
                titulo: s.titulo,
                descripcion: s.descripcion,
                precio: s.precio,
                imagenUrl: s.imagenUrl,
                activo: s.activo
            }))
        });

        return NextResponse.json({ message: 'Services seeded successfully', count: servicios.length });
    } catch (error) {
        console.error('Error seeding services:', error);
        return NextResponse.json({ error: 'Error seeding services' }, { status: 500 });
    }
}
