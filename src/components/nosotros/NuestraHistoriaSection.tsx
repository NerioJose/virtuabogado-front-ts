'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

export default function NuestraHistoria() {
	return (
		<>
			{/* Nuestra Historia */}
			<section className="py-16 bg-white">
				<div className="container mx-auto px-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.25 }}
							className="space-y-6">
							<h2 className="text-3xl font-bold text-azul-primario">
								Nuestra Historia
							</h2>
							<p className="text-gray-600 leading-relaxed">
								VirtuAbogado nació en 2025 con la visión de transformar la
								manera en que las personas acceden a servicios legales. Fundada
								por una abogada con amplia experiencia en diferentes áreas del
								derecho, nuestra plataforma busca eliminar las barreras
								tradicionales que dificultan el acceso a la asesoría legal de
								calidad.
							</p>
							<p className="text-gray-600 leading-relaxed">
								Desde nuestros inicios, nos hemos comprometido con la innovación
								y la excelencia en el servicio, utilizando la tecnología para
								conectar a clientes con abogados especializados de manera
								eficiente y accesible.
							</p>
							<p className="text-gray-600 leading-relaxed">
								Hoy, VirtuAbogado se ha consolidado como una plataforma líder en
								asesoría legal online, ayudando a miles de personas a resolver
								sus dudas y problemas legales desde la comodidad de su hogar u
								oficina.
							</p>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, x: 30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.25 }}
							className="relative h-[400px] w-full rounded-xl overflow-hidden shadow-lg">
							<Image
								src="/logo/logo_sf_1.png"
								alt="Nuestra Historia"
								fill
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
								className="object-contain p-4"
								priority
							/>
							<div className="absolute inset-0 bg-gradient-to-tr from-azul-primario/10 to-transparent"></div>
						</motion.div>
					</div>
				</div>
			</section>
		</>
	);
}
