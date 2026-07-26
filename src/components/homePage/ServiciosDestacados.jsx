'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useServices } from '@/features/services/hooks/useServices';
import { useServicesRealtime } from '@/features/services/hooks/useServicesRealtime';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { slugify } from '@/utils/formatters';

const ICON_MAP = {
	'Consultas Legales': (
		<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
		</svg>
	),
	'Revisión de Documentos': (
		<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
		</svg>
	),
	'Representación Legal': (
		<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
		</svg>
	),
    'Asesoría Empresarial': (
		<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
		</svg>
	),
	'Derecho Familiar': (
		<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
		</svg>
	),
	'Derecho Inmobiliario': (
		<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
		</svg>
	),
	'Asesoría Estudiantes de Derecho': (
		<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
		</svg>
	),
};

const DEFAULT_ICON = (
    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

export default function ServiciosDestacados() {
    const { isLoading } = useServices();
    useServicesRealtime(); // Suscripción en tiempo real (todos los usuarios, sin auth)
    const activeServices = useServicesStore(state => state.activeServices);
    
    // Obtener servicios activos desde el store de Zustand para actualización instantánea
    const services = (activeServices || [])
        .map(s => {
            const slug = slugify(s.titulo);
            // Mapeos manuales para consistencia con la página de servicios
            const manualMap = {
                'consultas-legales': 'consulta-legal',
                'revision-de-documentos': 'revision-documentos',
                'asesoria-legal': 'consulta-legal',
                'representacion-legal': 'representacion-legal'
            };
            const finalSlug = manualMap[slug] || slug;

            // Buscar icono por coincidencia parcial si no hay coincidencia exacta
            const findIcon = (title) => {
                if (ICON_MAP[title]) return ICON_MAP[title];
                
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('estudiantes') || lowerTitle.includes('virtustudents')) return ICON_MAP['Asesoría Estudiantes de Derecho'];
                if (lowerTitle.includes('empresa') || lowerTitle.includes('negocio')) return ICON_MAP['Asesoría Empresarial'];
                if (lowerTitle.includes('familiar') || lowerTitle.includes('familia')) return ICON_MAP['Derecho Familiar'];
                if (lowerTitle.includes('inmobiliario') || lowerTitle.includes('casa')) return ICON_MAP['Derecho Inmobiliario'];
                if (lowerTitle.includes('documento')) return ICON_MAP['Revisión de Documentos'];
                if (lowerTitle.includes('representación')) return ICON_MAP['Representación Legal'];
                if (lowerTitle.includes('consulta')) return ICON_MAP['Consultas Legales'];
                
                return DEFAULT_ICON;
            };

            return {
                id: s.id,
                title: s.titulo,
                description: s.descripcion,
                icon: findIcon(s.titulo),
                imagen: `/images/${finalSlug}.jpg`
            };
        });

	return (
		<>
			{/* Servicios Destacados */}
			<section className="py-20 bg-gray-50/50">
				<div className="container mx-auto px-6">
					<div className="text-center mb-16">
                        <motion.span 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            className="text-vinyl-blue font-black uppercase tracking-widest text-sm mb-2 block"
                        >
                            Excelencia Legal
                        </motion.span>
						<h2 className="text-4xl md:text-5xl font-bold text-azul-primario mb-4">
							Nuestros Servicios <span className="text-vinyl-blue italic">Destacados</span>
						</h2>
						<p className="text-gray-500 max-w-2xl mx-auto text-lg font-light">
							Soluciones jurídicas de alta gama, ahora accesibles con un clic.
						</p>
					</div>

					<div className="flex flex-wrap justify-center gap-10">
						{isLoading ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="w-full md:w-[calc(50%-1.25rem)] lg:w-[calc(33.333%-1.875rem)] bg-white p-8 rounded-3xl shadow-xl border border-gray-100 animate-pulse">
                                    <div className="w-16 h-16 bg-gray-100 rounded-2xl mb-6"></div>
                                    <div className="h-6 bg-gray-100 rounded w-3/4 mb-4"></div>
                                    <div className="h-20 bg-gray-100 rounded mb-6"></div>
                                    <div className="h-4 bg-gray-100 rounded w-1/4"></div>
                                </div>
                            ))
                        ) : (
                            services.map((service, index) => (
                                <motion.div
                                    key={service.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    className="w-full md:w-[calc(50%-1.25rem)] lg:w-[calc(33.333%-1.875rem)] group bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition duration-500 border border-gray-100 hover:-translate-y-2 relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full bg-azul-primario scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500"></div>
                                    
                                    <div className="w-16 h-16 bg-azul-claro/30 rounded-2xl flex items-center justify-center mb-6 text-azul-primario group-hover:bg-azul-primario group-hover:text-white transition-colors duration-500">
                                        {service.icon}
                                    </div>
                                    <h3 className="text-2xl font-bold text-azul-primario mb-4 group-hover:text-azul-primario/90 transition-colors">
                                        {service.title}
                                    </h3>
                                    <p className="text-gray-500 mb-8 line-clamp-3 leading-relaxed font-light">
                                        {service.description}
                                    </p>
                                    <Link
                                        href="/servicios"
                                        className="inline-flex items-center gap-2 text-azul-primario font-black hover:gap-4 transition"
                                    >
                                        Explorar servicio
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={3}
                                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                                            />
                                        </svg>
                                    </Link>
                                </motion.div>
                            ))
                        )}
					</div>
				</div>
			</section>
		</>
	);
}
