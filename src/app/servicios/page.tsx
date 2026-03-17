'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { CheckoutModal, useCheckout, CartRecovery } from '@/features/checkout';

export default function ServiciosPage() {
	const { openCheckout } = useCheckout();

	// Datos de los servicios
	const servicios = [
		{
			id: 1,
			nombre: 'Consultas Legales',
			titulo: 'Consultas Legales',
			precio: 99.99,
			descripcion:
				'Resuelve tus dudas legales con abogados especializados en diferentes áreas del derecho. Nuestros profesionales te brindarán asesoramiento claro y preciso para ayudarte a tomar las mejores decisiones.',
			icono: (
				<svg
					className="w-10 h-10"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
					/>
				</svg>
			),
			imagen: '/images/consulta-legal.jpg',
		},
		{
			id: 2,
			nombre: 'Revisión de Documentos',
			titulo: 'Revisión de Documentos',
			precio: 149.99,
			descripcion:
				'Análisis yrevisión de contratos, acuerdos y documentos legales por profesionales. Asegúrate de que tus documentos cumplan con todos los requisitos legales y protejan tus intereses.',
			icono: (
				<svg
					className="w-10 h-10"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			),
			imagen: '/images/revision-documentos.jpg',
		},
		{
			id: 3,
			nombre: 'Representación Legal',
			titulo: 'Representación Legal',
			precio: 299.99,
			descripcion:
				'Representación profesional en procesos judiciales y extrajudiciales. Nuestros abogados te acompañarán en cada etapa del proceso, defendiendo tus derechos e intereses con dedicación y profesionalismo.',
			icono: (
				<svg
					className="w-10 h-10"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
					/>
				</svg>
			),
			imagen: '/images/representacion-legal.jpg',
		},
		{
			id: 4,
			nombre: 'Asesoría Empresarial',
			titulo: 'Asesoría Empresarial',
			precio: 199.99,
			descripcion:
				'Servicios legales especializados para empresas y emprendedores. Desde la constitución de sociedades hasta la resolución de conflictos comerciales, te brindamos el apoyo legal que tu negocio necesita.',
			icono: (
				<svg
					className="w-10 h-10"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
					/>
				</svg>
			),
			imagen: '/images/asesoria-empresarial.jpg',
		},
		{
			id: 5,
			nombre: 'Derecho Familiar',
			titulo: 'Derecho Familiar',
			precio: 179.99,
			descripcion:
				'Asesoramiento en asuntos de familia como divorcios, custodia, pensiones alimenticias y más. Abordamos estos temas sensibles con empatía y profesionalismo, buscando siempre las mejores soluciones para todas las partes involucradas.',
			icono: (
				<svg
					className="w-10 h-10"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
					/>
				</svg>
			),
			imagen: '/images/derecho-familiar.jpg',
		},
		{
			id: 6,
			nombre: 'Derecho Inmobiliario',
			titulo: 'Derecho Inmobiliario',
			precio: 249.99,
			descripcion:
				'Servicios legales relacionados con propiedades, compraventas, arrendamientos y conflictos inmobiliarios. Te ayudamos a proteger tus inversiones y a resolver cualquier problema legal relacionado con bienes raíces.',
			icono: (
				<svg
					className="w-10 h-10"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
			),
			imagen: '/images/derecho-inmobiliario.jpg',
		},
	];

	return (
		<main className="min-h-screen">
			{/* Hero Section */}
			<section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-azul-claro/30 to-white">
				<div className="container mx-auto px-6 relative z-10">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.8 }}
						className="text-center max-w-3xl mx-auto">
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-azul-primario leading-tight mb-6">
							Nuestros <span className="text-vinotinto">Servicios</span> Legales
						</h1>
						<p className="text-lg md:text-xl text-gray-700">
							Ofrecemos una amplia gama de servicios legales especializados para
							satisfacer tus necesidades personales y empresariales.
						</p>
					</motion.div>
				</div>
			</section>

			{/* Servicios Detallados */}
			<section className="py-16 bg-white">
				<div className="container mx-auto px-6">
					<div className="grid grid-cols-1 gap-16">
						{servicios.map((servicio, index) => (
							<motion.div
								key={servicio.id}
								initial={{ opacity: 0, y: 30 }}
								animate={index === 0 ? { opacity: 1, y: 0 } : undefined}
								whileInView={index === 0 ? undefined : { opacity: 1, y: 0 }}
								transition={{ duration: 0.2 }}
								viewport={index === 0 ? undefined : { once: true, amount: 0.2 }}
								className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center ${index % 2 !== 0 ? 'lg:flex-row-reverse' : ''
									}`}>
								<div
									className={`space-y-6 ${index % 2 !== 0 ? 'lg:order-2' : ''
										}`}>
									<div className="w-16 h-16 bg-azul-claro rounded-lg flex items-center justify-center text-azul-primario">
										{servicio.icono}
									</div>
									<h2 className="text-3xl font-bold text-azul-primario">
										{servicio.titulo}
									</h2>
									<p className="text-gray-600 leading-relaxed">
										{servicio.descripcion}
									</p>
									<motion.button
										onClick={() => {
											// Sanitizar objeto para evitar guardar ReactNodes en el store
											const { icono, ...serviceData } = servicio;
											console.log('🔘 Click en servicio:', serviceData.nombre);
											openCheckout(serviceData);
										}}
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										className="btn-primary mt-4">
										Solicitar este servicio
									</motion.button>
								</div>
								<div
									className={`relative h-[300px] lg:h-[400px] w-full rounded-xl overflow-hidden shadow-lg bg-gray-100 ${index % 2 !== 0 ? 'lg:order-1' : ''
										}`}>
									<Image
										src={servicio.imagen}
										alt={servicio.titulo}
										fill
										className="object-cover"
										loading={index === 0 ? 'eager' : 'lazy'}
										priority={index === 0}
									/>
									<div className="absolute inset-0 bg-gradient-to-tr from-azul-primario/20 to-transparent"></div>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-16 bg-azul-claro/30">
				<div className="container mx-auto px-6">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						whileInView={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
						viewport={{ once: true }}
						className="glass-card p-10 text-center max-w-4xl mx-auto">
						<h2 className="text-3xl font-bold text-azul-primario mb-6">
							¿Necesitas asesoría legal personalizada?
						</h2>
						<p className="text-gray-600 mb-8 max-w-2xl mx-auto">
							Nuestro equipo de abogados especializados está listo para ayudarte
							con tu caso específico. Contáctanos hoy mismo para una consulta
							inicial.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link href="/contacto">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className="btn-primary">
									Contactar ahora
								</motion.button>
							</Link>
							{/*<Link href="/register">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className="px-6 py-3 bg-white text-azul-primario border border-azul-primario rounded-xl hover:bg-azul-claro transition-all duration-300">
									Registrarse
								</motion.button>
							</Link>*/}
						</div>
					</motion.div>
				</div>
			</section>

			{/* FAQ Section */}
			<section className="py-16 bg-white">
				<div className="container mx-auto px-6">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-azul-primario mb-4">
							Preguntas Frecuentes
						</h2>
						<p className="text-gray-600 max-w-2xl mx-auto">
							Respuestas a las dudas más comunes sobre nuestros servicios
							legales.
						</p>
					</div>

					<div className="max-w-3xl mx-auto space-y-6">
						{[
							{
								pregunta: '¿Cómo funciona la consulta legal online?',
								respuesta:
									'Nuestras consultas legales online se realizan a través de nuestra plataforma segura. Una vez registrado, podrás programar una cita con el abogado especializado en tu área de interés. La consulta se realiza por videollamada, donde podrás exponer tu caso y recibir asesoramiento profesional.',
							},
							{
								pregunta: '¿Cuánto tiempo tarda la revisión de documentos?',
								respuesta:
									'El tiempo de revisión depende de la complejidad y extensión del documento. Generalmente, los documentos simples se revisan en 24-48 horas, mientras que documentos más complejos pueden tomar hasta 5 días hábiles. Siempre te informaremos del tiempo estimado al recibir tu solicitud.',
							},
							{
								pregunta:
									'¿Los abogados pueden representarme en cualquier parte del país?',
								respuesta:
									'Contamos con una red de abogados en diferentes regiones del país. Dependiendo de tu ubicación y el tipo de caso, te asignaremos un profesional que pueda representarte adecuadamente. En casos que requieran presencia física, nos aseguramos de contar con representación local.',
							},
							{
								pregunta:
									'¿Cómo se garantiza la confidencialidad de mi información?',
								respuesta:
									'La confidencialidad es una prioridad para nosotros. Utilizamos sistemas de encriptación avanzados para proteger tus datos y documentos. Además, todos nuestros abogados están obligados por el secreto profesional a mantener la confidencialidad de la información compartida durante las consultas.',
							},
						].map((item, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 10 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.4, delay: index * 0.1 }}
								viewport={{ once: true }}
								className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
								<h3 className="text-xl font-bold text-azul-primario mb-3">
									{item.pregunta}
								</h3>
								<p className="text-gray-600">{item.respuesta}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* Checkout Modal y CartRecovery movidos al layout global */}
		</main>
	);
}
