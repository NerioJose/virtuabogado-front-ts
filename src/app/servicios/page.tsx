'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { CheckoutModal, useCheckout, CartRecovery } from '@/features/checkout';
import { useServices } from '@/features/services/hooks/useServices';
import { useServicesRealtime } from '@/features/services/hooks/useServicesRealtime';
import { Service } from '@/features/services/types/services.types';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { formatUSD } from '@/lib/finance';

// Mapeo de iconos para mantener el estilo visual con datos dinámicos
const ICON_MAP: Record<string, React.ReactNode> = {
	'Consultas Legales': (
		<svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
		</svg>
	),
	'Revisión de Documentos': (
		<svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
		</svg>
	),
	'Representación Legal': (
		<svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
		</svg>
	),
	'Asesoría Empresarial': (
		<svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
		</svg>
	),
	'Derecho Familiar': (
		<svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
		</svg>
	),
	'Derecho Inmobiliario': (
		<svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
		</svg>
	),
	'Asesoría Estudiantes de Derecho': (
		<svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
			<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
		</svg>
	),
};

const DEFAULT_ICON = (
	<svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
	</svg>
);

import { slugify } from '@/utils/formatters';

export default function ServiciosPage() {
	const { openCheckout } = useCheckout();
	const { isLoading } = useServices();
	useServicesRealtime(); // Tiempo real para todos los usuarios (sin auth requerida)
	const activeServices = useServicesStore(state => state.activeServices);

	// Helper para previsualizar imagen con la misma logica del admin pero mejorada
	const getServiceImage = (service: Service) => {
		if (service.imagenUrl) return service.imagenUrl;
        
        const slug = slugify(service.titulo);
        
        // Mapeos manuales para casos conocidos de plural/singular o nombres distintos
        const manualMap: Record<string, string> = {
            'consultas-legales': 'consulta-legal',
            'revision-de-documentos': 'revision-documentos',
            'redaccion-de-documentos': 'revision-documentos',
            'asesoria-legal': 'consulta-legal',
            'representacion-legal': 'representacion-legal',
            'asesoria-estudiantes-de-derecho': 'virtustudents.jpg'
        };

        const finalSlug = manualMap[slug] || slug;
		
        // Si el slug ya tiene extensión (como .jpg), no añadir .png
        if (finalSlug.includes('.')) {
            return `/images/${finalSlug}`;
        }
        
        return `/images/${finalSlug}.png`;
	};

	const servicios = (activeServices || [])
        .map(s => {
            // Mapping de imágenes manual para nombres que no coinciden con el slug estándar
            let imagenPath = getServiceImage(s);

            return {
                id: s.id,
                nombre: s.titulo,
                titulo: s.titulo,
                precio: Number(s.precio),
                descripcion: s.descripcion,
                icono: ICON_MAP[s.titulo] || DEFAULT_ICON,
                imagen: imagenPath,
            };
        });

	return (
		<main className="min-h-screen">
			<CheckoutModal />
			<CartRecovery />

			{/* Hero Section */}
			<section className="relative py-20 bg-azul-primario text-white overflow-hidden">
				<div className="absolute inset-0 z-0 opacity-20">
					<Image
						src="/images/consulta-legal.png"
						alt="Servicios Legales"
						fill
						className="object-cover"
						priority
					/>
				</div>
				<div className="absolute inset-0 bg-gradient-to-b from-azul-primario/80 to-azul-primario z-10"></div>

				<div className="container mx-auto px-6 relative z-20 text-center">
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="text-4xl md:text-6xl font-bold mb-6">
						Nuestros Servicios <span className="text-vinyl-blue font-black">Legales</span>
					</motion.h1>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="text-xl text-azul-claro max-w-3xl mx-auto">
						Ofrecemos soluciones legales integrales adaptadas a tus necesidades.
						Calidad, confianza y profesionalismo en cada trámite.
					</motion.p>
				</div>
			</section>

			{/* Servicios Detallados */}
			<section className="py-16 bg-white">
				<div className="container mx-auto px-6">
					{isLoading ? (
						<div className="grid grid-cols-1 gap-16">
							{[1, 2, 3].map(i => (
								<div key={i} className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center animate-pulse">
									<div className="space-y-6 text-center lg:text-left">
										<div className="w-16 h-16 bg-gray-100 rounded-lg mx-auto lg:mx-0"></div>
										<div className="h-10 bg-gray-100 rounded w-3/4 mx-auto lg:mx-0"></div>
										<div className="h-24 bg-gray-100 rounded"></div>
										<div className="h-12 bg-gray-100 rounded w-1/3 mx-auto lg:mx-0"></div>
									</div>
									<div className="h-[300px] lg:h-[400px] bg-gray-100 rounded-xl"></div>
								</div>
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-16">
							{servicios.map((servicio, index) => (
								<motion.div
									key={servicio.id}
									initial={{ 
                                        opacity: 0, 
                                        x: index % 2 === 0 ? -60 : 60,
                                        y: 20
                                    }}
									whileInView={{ 
                                        opacity: 1, 
                                        x: 0,
                                        y: 0 
                                    }}
									transition={{ 
                                        duration: 0.8, 
                                        delay: 0.1,
                                        ease: [0.21, 0.47, 0.32, 0.98] // Smooth cubic-bezier
                                    }}
									viewport={{ once: true, margin: "-100px" }}
									className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
									<div
										className={`space-y-6 text-center lg:text-left ${index % 2 !== 0 ? 'lg:order-2' : ''
											}`}>
										<div className="inline-flex items-center justify-center w-14 h-14 bg-azul-primario/10 text-azul-primario rounded-2xl mb-2 transition-transform hover:scale-110">
											<div className="w-8 h-8 flex items-center justify-center">
                                                {servicio.icono}
                                            </div>
										</div>
										<h2 className="text-3xl font-bold text-azul-primario leading-tight">
											{servicio.titulo}
										</h2>
                                        <div className="flex items-center gap-2 justify-center lg:justify-start">
                                            <div className="bg-azul-primario text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-md border border-white/10 flex items-center gap-2">
                                                <span className="opacity-80">Desde</span>
                                                <span className="text-base">{formatUSD(servicio.precio)}</span>
                                            </div>
                                        </div>
										<p className="text-gray-600 leading-relaxed text-lg">
											{servicio.descripcion}
										</p>
										<motion.button
											onClick={() => {
												// Sanitizar objeto para evitar guardar ReactNodes en el store
												const { icono, ...serviceData } = servicio;
												openCheckout(serviceData);
											}}
											whileHover={{ scale: 1.05 }}
											whileTap={{ scale: 0.95 }}
											className="btn-primary mt-4 font-bold shadow-lg">
											Solicitar este servicio
										</motion.button>
									</div>
									<div
										className={`relative h-[300px] lg:h-[400px] w-full rounded-xl overflow-hidden shadow-2xl group ${index % 2 !== 0 ? 'lg:order-1' : ''
											}`}>
										<Image
											src={servicio.imagen}
											alt={servicio.titulo}
											fill
											className="object-cover transition-transform duration-700 group-hover:scale-110"
											loading={index === 0 ? 'eager' : 'lazy'}
											priority={index === 0}
										/>
										<div className="absolute inset-0 bg-gradient-to-tr from-azul-primario/40 to-transparent mix-blend-multiply"></div>
									</div>
								</motion.div>
							))}
						</div>
					)}
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-azul-primario text-white">
				<div className="container mx-auto px-6">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						whileInView={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
						viewport={{ once: true }}
						className="bg-white/10 backdrop-blur-md rounded-3xl p-10 md:p-16 border border-white/20 text-center">
						<h2 className="text-3xl md:text-5xl font-bold mb-6">¿No encuentras lo que buscas?</h2>
						<p className="text-xl text-azul-claro mb-10 max-w-2xl mx-auto font-light">
							Contáctanos directamente y uno de nuestros asesores legales te ayudará con tu caso personalizado.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link href="/contacto" className="btn-secondary px-10 py-4 font-bold">
								Contactar Asesor
							</Link>
							<Link href="/faq" className="bg-white/10 hover:bg-white/20 text-white px-10 py-4 rounded-full transition-all flex items-center justify-center font-bold">
								Ver Preguntas Frecuentes
							</Link>
						</div>
					</motion.div>
				</div>
			</section>
		</main>
	);
}
