'use client';

import { motion } from 'framer-motion';

export default function HeroSection() {
	return (
		<>
			{/* Hero Section */}
			<section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-br from-azul-claro/30 to-white">
				<div className="container mx-auto px-6 relative z-10">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.3 }}
						className="text-center max-w-3xl mx-auto">
						<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-azul-primario leading-tight mb-6">
							Sobre <span className="text-vinotinto">Nosotros</span>
						</h1>
						<p className="text-lg md:text-xl text-gray-700">
							Conoce quiénes somos y nuestra misión de hacer la asesoría legal
							accesible para todos.
						</p>
					</motion.div>
				</div>
			</section>
		</>
	);
}
