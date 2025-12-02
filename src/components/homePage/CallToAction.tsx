import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CallToAction() {
	return (
		// Call to Action
		<section className="py-16 bg-gradient-to-r from-vinotinto to-azul-primario text-white">
			<div className="container mx-auto px-6 text-center">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3 }}
					viewport={{ once: true }}
					className="max-w-3xl mx-auto space-y-6">
					<h2 className="text-3xl md:text-4xl font-bold">
						¿Listo para resolver tus asuntos legales?
					</h2>
					<p className="text-lg text-white/80">
						Únete a nuestra plataforma y conecta con abogados especializados.
					</p>
					<div className="pt-4">
						<Link href="/servicios">
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								className="px-8 py-4 bg-white text-vinotinto font-bold rounded-xl shadow-lg hover:bg-azul-claro transition-all duration-300">
								Comenzar ahora
							</motion.button>
						</Link>
					</div>
				</motion.div>
			</div>
		</section>
	);
}
