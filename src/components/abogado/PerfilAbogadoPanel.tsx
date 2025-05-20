import { useState } from 'react';
import {
	FiEdit,
	FiSave,
	FiUser,
	FiMail,
	FiPhone,
	FiBookmark,
	FiAward,
	FiStar,
	FiCheck,
	FiClock,
	FiPieChart,
} from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';

interface PerfilAbogadoPanelProps {
	abogado: {
		id: number;
		nombre: string;
		email: string;
		telefono: string;
		especialidad: string;
		numeroColegiado: string;
		experienciaAnios: number;
		valoracionMedia: number;
	};
}

export default function PerfilAbogadoPanel({
	abogado,
}: PerfilAbogadoPanelProps) {
	const [editando, setEditando] = useState(false);
	const [datosEditados, setDatosEditados] = useState({
		nombre: abogado.nombre,
		email: abogado.email,
		telefono: abogado.telefono,
		especialidad: abogado.especialidad,
	});
	const [guardando, setGuardando] = useState(false);
	const [exito, setExito] = useState(false);

	// Manejador de cambios en los campos del formulario
	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setDatosEditados({
			...datosEditados,
			[name]: value,
		});
	};

	// Función para guardar los cambios
	const guardarCambios = async () => {
		setGuardando(true);

		try {
			// Aquí iría la llamada a la API para actualizar los datos del abogado
			// Por ahora, simulamos una respuesta exitosa después de 1 segundo
			await new Promise((resolve) => setTimeout(resolve, 1000));

			setExito(true);
			setEditando(false);

			// Ocultar el mensaje de éxito después de 3 segundos
			setTimeout(() => {
				setExito(false);
			}, 3000);
		} catch (error) {
			console.error('Error al guardar cambios:', error);
		} finally {
			setGuardando(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<h2 className="text-xl font-bold text-gray-800">Mi Perfil</h2>

				{!editando ? (
					<button
						onClick={() => setEditando(true)}
						className="flex items-center px-4 py-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-colors">
						<FiEdit className="mr-2" />
						Editar perfil
					</button>
				) : (
					<button
						onClick={guardarCambios}
						disabled={guardando}
						className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
						{guardando ? (
							<>
								<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
								Guardando...
							</>
						) : (
							<>
								<FiSave className="mr-2" />
								Guardar cambios
							</>
						)}
					</button>
				)}
			</div>

			{exito && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
					<FiCheck className="text-green-500 mr-2" />
					<span>Perfil actualizado correctamente</span>
				</div>
			)}

			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="p-6">
					<div className="flex flex-col md:flex-row gap-8">
						{/* Foto de perfil */}
						<div className="flex flex-col items-center">
							<div className="relative w-40 h-40 rounded-full overflow-hidden mb-4">
								<Image
									src={userImage}
									alt={abogado.nombre}
									fill
									className="object-cover"
								/>
							</div>

							<button className="text-sm text-azul-primario hover:underline">
								Cambiar foto
							</button>

							<div className="mt-4 flex items-center">
								<FiStar className="text-yellow-500 mr-1" />
								<span className="font-medium">{abogado.valoracionMedia}</span>
								<span className="text-gray-500 text-sm ml-1">/ 5</span>
							</div>
						</div>

						{/* Información personal */}
						<div className="flex-1 space-y-6">
							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
									Información personal
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label
											htmlFor="nombre"
											className="block text-sm font-medium text-gray-700 mb-1">
											<FiUser className="inline-block mr-2 text-gray-400" />
											Nombre completo
										</label>
										{editando ? (
											<input
												type="text"
												id="nombre"
												name="nombre"
												value={datosEditados.nombre}
												onChange={handleChange}
												className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
											/>
										) : (
											<p className="text-gray-900">{abogado.nombre}</p>
										)}
									</div>

									<div>
										<label
											htmlFor="email"
											className="block text-sm font-medium text-gray-700 mb-1">
											<FiMail className="inline-block mr-2 text-gray-400" />
											Correo electrónico
										</label>
										{editando ? (
											<input
												type="email"
												id="email"
												name="email"
												value={datosEditados.email}
												onChange={handleChange}
												className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
											/>
										) : (
											<p className="text-gray-900">{abogado.email}</p>
										)}
									</div>

									<div>
										<label
											htmlFor="telefono"
											className="block text-sm font-medium text-gray-700 mb-1">
											<FiPhone className="inline-block mr-2 text-gray-400" />
											Teléfono
										</label>
										{editando ? (
											<input
												type="tel"
												id="telefono"
												name="telefono"
												value={datosEditados.telefono}
												onChange={handleChange}
												className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
											/>
										) : (
											<p className="text-gray-900">{abogado.telefono}</p>
										)}
									</div>

									<div>
										<label
											htmlFor="especialidad"
											className="block text-sm font-medium text-gray-700 mb-1">
											<FiBookmark className="inline-block mr-2 text-gray-400" />
											Especialidad
										</label>
										{editando ? (
											<select
												id="especialidad"
												name="especialidad"
												value={datosEditados.especialidad}
												onChange={handleChange}
												className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm">
												<option value="Derecho Civil">Derecho Civil</option>
												<option value="Derecho Penal">Derecho Penal</option>
												<option value="Derecho Mercantil">
													Derecho Mercantil
												</option>
												<option value="Derecho Laboral">Derecho Laboral</option>
												<option value="Derecho Administrativo">
													Derecho Administrativo
												</option>
												<option value="Derecho Fiscal">Derecho Fiscal</option>
												<option value="Derecho de Familia">
													Derecho de Familia
												</option>
											</select>
										) : (
											<p className="text-gray-900">{abogado.especialidad}</p>
										)}
									</div>
								</div>
							</div>

							<div>
								<h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-200 pb-2">
									Información profesional
								</h3>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											<FiAward className="inline-block mr-2 text-gray-400" />
											Número de colegiado
										</label>
										<p className="text-gray-900">{abogado.numeroColegiado}</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											<FiClock className="inline-block mr-2 text-gray-400" />
											Años de experiencia
										</label>
										<p className="text-gray-900">
											{abogado.experienciaAnios} años
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
