import Link from 'next/link';
import { motion } from 'framer-motion';
export default function ServiciosDestacados() {
	return (
		<>
			{/* Servicios Destacados */}
			<section className="py-16 bg-white">
				<div className="container mx-auto px-6">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-azul-primario mb-4">
							Nuestros Servicios
						</h2>
						<p className="text-gray-600 max-w-2xl mx-auto">
							Ofrecemos una amplia gama de servicios legales para satisfacer tus
							necesidades.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
						{[
							{
								title: 'Consultas Legales',
								description:
									'Resuelve tus dudas legales con abogados especializados en diferentes áreas del derecho.',
								icon: (
									<svg
										className="w-8 h-8"
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
							},
							{
								title: 'Revisión de Documentos',
								description:
									'Análisis y revisión de contratos, acuerdos y documentos legales por profesionales.',
								icon: (
									<svg
										className="w-8 h-8"
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
							},
							{
								title: 'Representación Legal',
								description:
									'Representación profesional en procesos judiciales y extrajudiciales.',
								icon: (
									<svg
										className="w-8 h-8"
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
							},
						].map((service, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								viewport={{ once: true }}
								className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100">
								<div className="w-16 h-16 bg-azul-claro rounded-lg flex items-center justify-center mb-4 text-azul-primario">
									{service.icon}
								</div>
								<h3 className="text-xl font-bold text-azul-primario mb-3">
									{service.title}
								</h3>
								<p className="text-gray-600 mb-4">{service.description}</p>
								<Link
									href="/servicios"
									className="text-vinotinto font-medium hover:text-vinotinto-light flex items-center gap-2">
									Saber más
									<svg
										className="w-4 h-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M14 5l7 7m0 0l-7 7m7-7H3"
										/>
									</svg>
								</Link>
							</motion.div>
						))}
					</div>
				</div>
			</section>
		</>
	);
}
