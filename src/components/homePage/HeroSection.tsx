import Image from 'next/image';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function HeroSection() {
	return (
		<>
			{/* Hero Section */}
			<section className="relative py-20 md:py-28 overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-br from-azul-claro/30 to-white z-0"></div>
				<div className="container mx-auto px-6 relative z-10">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<motion.div
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.3 }}
							className="space-y-6">
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-azul-primario leading-tight">
								Asesoría legal{' '}
								<span className="text-vinotinto">profesional</span> a tu alcance
							</h1>
							<p className="text-lg md:text-xl text-gray-700 max-w-xl">
								Conectamos a clientes con abogados especializados para resolver
								tus consultas legales de manera rápida y eficiente.
							</p>
							<div className="flex flex-col sm:flex-row gap-4 pt-4">
								<Link href="/servicios">
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										className="btn-primary w-full sm:w-auto">
										Comenzar ahora
									</motion.button>
								</Link>
								<Link href="/servicios">
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										className="px-6 py-3 bg-white text-azul-primario border border-azul-primario rounded-xl hover:bg-azul-claro transition-all duration-300 w-full sm:w-auto">
										Conoce nuestros servicios
									</motion.button>
								</Link>
							</div>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0 }}
							className="relative">
							<div className="relative h-[400px] w-full">
								<Image
									src="/images/consulta-legal.jpg"
									alt="Asesoría legal profesional"
									fill
									className="object-cover rounded-xl shadow-lg"
									priority
									sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
									quality={85}
								/>
								<div className="absolute inset-0 bg-gradient-to-tr from-azul-primario/20 to-transparent rounded-xl"></div>
							</div>
							<div className="absolute -bottom-6 -left-6 p-6 bg-white rounded-xl shadow-lg glass-card max-w-xs">
								<div className="flex items-center gap-4 mb-3">
									<div className="w-12 h-12 bg-azul-claro rounded-full flex items-center justify-center">
										<svg
											className="w-6 h-6 text-azul-primario"
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
									</div>
									<h3 className="text-lg font-bold text-azul-primario">
										100% Confiable
									</h3>
								</div>
								<p className="text-gray-600">
									Abogados verificados y con experiencia en diversas áreas del
									derecho.
								</p>
							</div>
						</motion.div>
					</div>
				</div>
			</section>
		</>
	);
}
