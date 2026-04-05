'use client';

import { motion } from 'framer-motion';
import { FiBriefcase, FiUsers, FiHome, FiFileText, FiAward } from 'react-icons/fi';

export default function NuestroEquipoSection() {
	// Datos del equipo con iconos específicos
	const equipo = [
		{
			id: 1,
			nombre: 'Carlos Rodríguez',
			cargo: 'Abogado Senior',
			especialidad: 'Derecho Mercantil',
			descripcion:
				'Con más de 15 años de experiencia en asesoría legal para empresas nacionales e internacionales.',
			icono: <FiBriefcase className="text-4xl text-azul-primario" />,
            color: 'from-blue-50 to-indigo-50'
		},
		{
			id: 2,
			nombre: 'María González',
			cargo: 'Abogada',
			especialidad: 'Derecho Familiar',
			descripcion:
				'Especialista en casos de familia, con un enfoque humano y orientado a soluciones pacíficas.',
			icono: <FiUsers className="text-4xl text-vinotinto" />,
            color: 'from-rose-50 to-orange-50'
		},
		{
			id: 3,
			nombre: 'Miguel Ángel Torres',
			cargo: 'Abogado',
			especialidad: 'Derecho Inmobiliario',
			descripcion:
				'Experto en transacciones inmobiliarias y resolución de conflictos relacionados con propiedades.',
			icono: <FiHome className="text-4xl text-cyan-600" />,
            color: 'from-cyan-50 to-blue-50'
		},
		{
			id: 4,
			nombre: 'Laura Martínez',
			cargo: 'Abogada',
			especialidad: 'Derecho Laboral',
			descripcion:
				'Dedicada a la defensa de los derechos laborales con amplia experiencia en negociaciones colectivas.',
			icono: <FiFileText className="text-4xl text-amber-600" />,
            color: 'from-amber-50 to-yellow-50'
		},
	];

	return (
		<section className="py-24 bg-slate-50/50">
			<div className="container mx-auto px-6">
				<div className="text-center mb-16">
					<motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-azul-primario/5 text-azul-primario rounded-full text-xs font-bold uppercase tracking-widest mb-6"
                    >
                        <FiAward /> Excelencia Legal
                    </motion.div>
					<h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">
						Nuestros Especialistas
					</h2>
					<p className="text-slate-500 max-w-2xl mx-auto text-lg">
						Contamos con un equipo de expertos jurídicos de élite, seleccionados por su trayectoria y compromiso con el éxito de nuestros clientes.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
					{equipo.map((miembro, index) => (
						<motion.div
							key={miembro.id}
							initial={{ opacity: 0, y: 30 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.5, delay: index * 0.1 }}
							viewport={{ once: true }}
							className="group bg-white rounded-3xl shadow-xl shadow-blue-900/5 p-8 border border-slate-100 hover:border-azul-primario/20 hover:shadow-2xl hover:shadow-azul-primario/10 transition-all duration-500"
                        >
							{/* Icon Area */}
							<div className={`relative w-20 h-20 mb-8 rounded-2xl bg-gradient-to-br ${miembro.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-500`}>
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="relative z-10 filter drop-shadow-sm">
                                    {miembro.icono}
                                </div>
							</div>

							<div className="space-y-4">
								<div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-azul-primario transition-colors">
                                        {miembro.nombre}
                                    </h3>
                                    <p className="text-azul-primario text-sm font-bold uppercase tracking-wider">{miembro.cargo}</p>
                                </div>
								<div className="h-0.5 w-10 bg-azul-primario/20 group-hover:w-full transition-all duration-700"></div>
								<p className="text-slate-500 text-sm leading-relaxed">
									{miembro.descripcion}
								</p>
                                <div className="pt-4 flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <span className="w-1.5 h-1.5 bg-azul-primario rounded-full"></span>
                                    {miembro.especialidad}
                                </div>
							</div>
						</motion.div>
					))}
				</div>
			</div>
		</section>
	);
}
