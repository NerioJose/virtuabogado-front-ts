import Image from 'next/image';
import { motion } from 'framer-motion';

export default function NuestroEquipoSection() {
	// Datos del equipo
	const equipo = [
		{
			id: 1,
			nombre: 'Carlos Rodríguez',
			cargo: 'Abogado Senior',
			especialidad: 'Derecho Mercantil',
			descripcion:
				'Con más de 15 años de experiencia en asesoría legal para empresas nacionales e internacionales.',
			imagen: '/images/abogado-2.png',
		},
		{
			id: 2,
			nombre: 'María González',
			cargo: 'Abogada',
			especialidad: 'Derecho Familiar',
			descripcion:
				'Especialista en casos de familia, con un enfoque humano y orientado a soluciones pacíficas.',
			imagen: '/images/abogado-4.png',
		},
		{
			id: 3,
			nombre: 'Miguel Ángel Torres',
			cargo: 'Abogado',
			especialidad: 'Derecho Inmobiliario',
			descripcion:
				'Experto en transacciones inmobiliarias y resolución de conflictos relacionados con propiedades.',
			imagen: '/images/abogado-1.png',
		},
		{
			id: 4,
			nombre: 'Laura Martínez',
			cargo: 'Abogada',
			especialidad: 'Derecho Laboral',
			descripcion:
				'Dedicada a la defensa de los derechos laborales con amplia experiencia en negociaciones colectivas.',
			imagen: '/images/abogado-3.png',
		},
	];
	return (
		<>
			{/* Nuestro Equipo */}
			<section className="py-16 bg-white">
				<div className="container mx-auto px-6">
					<div className="text-center mb-12">
						<h2 className="text-3xl font-bold text-azul-primario mb-4">
							Nuestro Equipo
						</h2>
						<p className="text-gray-600 max-w-2xl mx-auto">
							Profesionales comprometidos con la excelencia y el servicio al
							cliente.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
						{equipo.map((miembro) => (
							<motion.div
								key={miembro.id}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.2 }}
								viewport={{ once: true }}
								className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
								<div className="relative h-64 w-full">
									<Image
										src={miembro.imagen}
										alt={miembro.nombre}
										fill
										className="object-cover"
										loading="lazy"
									/>
								</div>
								<div className="p-6">
									<h3 className="text-xl font-bold text-azul-primario">
										{miembro.nombre}
									</h3>
									<p className="text-vinotinto font-medium">{miembro.cargo}</p>
									<p className="text-gray-500 text-sm mb-3">
										{miembro.especialidad}
									</p>
									<p className="text-gray-600">{miembro.descripcion}</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>
		</>
	);
}
