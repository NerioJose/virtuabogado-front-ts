import { motion } from 'framer-motion';

export default function ValoresSection() {
	return (
		<>
			{/* Valores */}
			<section className="py-16 bg-azul-claro/20">
				<div className="container mx-auto px-6">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-azul-primario mb-4">
							Nuestros Valores
						</h2>
						<p className="text-gray-600 max-w-2xl mx-auto">
							Principios que guían nuestras acciones y decisiones cada día.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{[
							{
								titulo: 'Excelencia',
								descripcion:
									'Nos esforzamos por ofrecer el más alto nivel de servicio en cada interacción con nuestros clientes.',
								icono: (
									<svg
										className="w-8 h-8"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								),
							},
							{
								titulo: 'Integridad',
								descripcion:
									'Actuamos con honestidad, transparencia y ética en todas nuestras relaciones profesionales.',
								icono: (
									<svg
										className="w-8 h-8"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
										/>
									</svg>
								),
							},
							{
								titulo: 'Innovación',
								descripcion:
									'Buscamos constantemente nuevas formas de mejorar nuestros servicios y la experiencia de nuestros clientes.',
								icono: (
									<svg
										className="w-8 h-8"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M13 10V3L4 14h7v7l9-11h-7z"
										/>
									</svg>
								),
							},
							{
								titulo: 'Accesibilidad',
								descripcion:
									'Trabajamos para hacer que los servicios legales sean comprensibles y accesibles para todos.',
								icono: (
									<svg
										className="w-8 h-8"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								),
							},
							{
								titulo: 'Empatía',
								descripcion:
									'Entendemos las necesidades y preocupaciones de nuestros clientes, ofreciendo un trato humano y cercano.',
								icono: (
									<svg
										className="w-8 h-8"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
										/>
									</svg>
								),
							},
							{
								titulo: 'Confidencialidad',
								descripcion:
									'Protegemos la privacidad y la información de nuestros clientes con los más altos estándares de seguridad.',
								icono: (
									<svg
										className="w-8 h-8"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
										/>
									</svg>
								),
							},
						].map((valor, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								viewport={{ once: true }}
								className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
								<div className="w-14 h-14 bg-azul-claro rounded-lg flex items-center justify-center text-azul-primario mb-4">
									{valor.icono}
								</div>
								<h3 className="text-xl font-bold text-azul-primario mb-3">
									{valor.titulo}
								</h3>
								<p className="text-gray-600">{valor.descripcion}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>
		</>
	);
}
