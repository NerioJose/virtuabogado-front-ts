import { motion } from 'framer-motion';

export default function MisionVisionSection() {
	return (
		<>
			{/* Misión y Visión */}
			<section className="py-16 bg-azul-claro/20">
				<div className="container mx-auto px-6">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-azul-primario mb-4">
							Misión y Visión
						</h2>
						<p className="text-gray-600 max-w-2xl mx-auto">
							Nuestros valores fundamentales que guían nuestro trabajo diario.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5 }}
							viewport={{ once: true }}
							className="glass-card p-8">
							<div className="w-16 h-16 bg-azul-claro rounded-lg flex items-center justify-center text-azul-primario mb-6">
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
							</div>
							<h3 className="text-2xl font-bold text-azul-primario mb-4">
								Nuestra Misión
							</h3>
							<p className="text-gray-600 leading-relaxed">
								Democratizar el acceso a servicios legales de calidad mediante
								una plataforma tecnológica que conecte a personas y empresas con
								abogados especializados, ofreciendo soluciones eficientes,
								transparentes y accesibles para todos.
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: 0 }}
							viewport={{ once: true }}
							className="glass-card p-8">
							<div className="w-16 h-16 bg-azul-claro rounded-lg flex items-center justify-center text-azul-primario mb-6">
								<svg
									className="w-8 h-8"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							</div>
							<h3 className="text-2xl font-bold text-azul-primario mb-4">
								Nuestra Visión
							</h3>
							<p className="text-gray-600 leading-relaxed">
								Ser la plataforma líder en asesoría legal online, reconocida por
								su innovación, calidad de servicio y compromiso con la justicia,
								transformando positivamente la manera en que las personas
								acceden y experimentan los servicios legales en todo el país.
							</p>
						</motion.div>
					</div>
				</div>
			</section>
		</>
	);
}
