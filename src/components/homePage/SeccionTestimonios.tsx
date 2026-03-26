import Image from 'next/image';
import { motion } from 'framer-motion';

const testimonios = [
	{
		name: 'María González',
		role: 'Empresaria',
		testimonial:
			'El servicio fue excelente. Recibí asesoría clara y profesional para mi caso de derecho mercantil.',
		avatar: '/images/testimonial-1.jpg',
	},
	{
		name: 'Carlos Rodríguez',
		role: 'Propietario',
		testimonial:
			'Gracias a VirtuAbogado pude resolver rápidamente un problema de arrendamiento que tenía pendiente.',
		avatar: '/images/testimonial-2.jpg',
	},
	{
		name: 'Laura Martínez',
		role: 'Profesional',
		testimonial:
			'La plataforma es muy intuitiva y los abogados son realmente profesionales. Totalmente recomendado.',
		avatar: '/images/testimonial-3.jpg',
	},
];

export default function SectionTestimonios() {
	return (
		<section className="py-16 bg-azul-claro/30">
			<div className="container mx-auto px-6">
				<div className="text-center mb-12">
					<h2 className="text-3xl font-bold text-azul-primario mb-4">
						Lo que dicen nuestros clientes
					</h2>
					<p className="text-gray-600 max-w-2xl mx-auto">
						Testimonios de personas que han confiado en nuestros servicios.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
					{testimonios.map((testimonial, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, scale: 0.95 }}
							whileInView={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.2 }}
							viewport={{ once: true }}
							className="bg-white p-6 rounded-xl shadow-md">
							<div className="flex items-center gap-4 mb-4">
								<div className="w-12 h-12 rounded-full overflow-hidden relative">
									<Image
										src={testimonial.avatar}
										alt={testimonial.name}
										fill
										className="object-cover"
										loading="lazy"
									/>
								</div>
								<div>
									<h4 className="font-bold text-azul-primario">
										{testimonial.name}
									</h4>
									<p className="text-sm text-gray-500">{testimonial.role}</p>
								</div>
							</div>
							<p className="text-gray-600 italic">
								&ldquo;{testimonial.testimonial}&rdquo;
							</p>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
