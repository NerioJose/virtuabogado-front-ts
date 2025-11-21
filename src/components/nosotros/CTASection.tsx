import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CtaSection() {
	return (
		<>
			{/* CTA Section */}
			<section className="py-16 bg-white">
				<div className="container mx-auto px-6">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						whileInView={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
						viewport={{ once: true }}
						className="glass-card p-10 text-center max-w-4xl mx-auto">
						<h2 className="text-3xl font-bold text-azul-primario mb-6">
							¿Listo para comenzar?
						</h2>
						<p className="text-gray-600 mb-8 max-w-2xl mx-auto">
							Únete a nuestra comunidad y descubre cómo podemos ayudarte con tus
							necesidades legales.
						</p>
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<Link href="/contacto">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className="btn-primary">
									Contáctanos
								</motion.button>
							</Link>
							<Link href="/servicios">
								<motion.button
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									className="px-6 py-3 bg-white text-azul-primario border border-azul-primario rounded-xl hover:bg-azul-claro transition-all duration-300">
									Ver servicios
								</motion.button>
							</Link>
						</div>
					</motion.div>
				</div>
			</section>
		</>
	);
}
