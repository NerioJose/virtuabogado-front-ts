'use client';

import { useState, useEffect } from 'react';
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
	FiX,
	FiLock,
	FiShield,
} from 'react-icons/fi';
import Image from 'next/image';
import userImage from '../../../public/images/user-placeholder.png';
import { createClient } from '@/utils/supabase/client';
import { lawyersService } from '@/features/lawyers/services/lawyers.service';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface PerfilAbogadoPanelProps {
	abogado: {
		id: string;
		nombre: string;
		email: string;
		telefono: string;
		picture?: string;
		especialidad: string;
		numeroColegiado: string;
		experienciaAnios: number;
		valoracionMedia: number;
	};
}

export default function PerfilAbogadoPanel({
	abogado,
}: PerfilAbogadoPanelProps) {
	const supabase = createClient();
	const { updateUser } = useAuthStore();
	const [editando, setEditando] = useState(false);
	const [datosEditados, setDatosEditados] = useState({
		nombre: abogado.nombre,
		email: abogado.email,
		telefono: abogado.telefono,
		especialidad: abogado.especialidad,
	});
	const [guardando, setGuardando] = useState(false);
	const [exito, setExito] = useState(false);
	const { changePassword, isLoading: cambiandopassword } = useAuth();
	const [passwords, setPasswords] = useState({
		actual: '',
		nueva: '',
		confirmar: ''
	});

	const [notificacion, setNotificacion] = useState<{tipo: 'success' | 'info' | 'error', mensaje: string} | null>(null);

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

	const handleFotoClick = () => {
		document.getElementById('foto-input')?.click();
	};

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		try {
			setNotificacion({ tipo: 'info', mensaje: 'Subiendo foto de perfil...' });

			const fileExt = file.name.split('.').pop();
			const fileName = `${abogado.id}/${Date.now()}.${fileExt}`;
			const filePath = `${fileName}`;

			// 1. Subir a Supabase Storage
			const { error: uploadError } = await supabase.storage
				.from('avatars')
				.upload(filePath, file, { upsert: true });

			if (uploadError) throw uploadError;

			// 2. Obtener URL pública
			const { data: { publicUrl } } = supabase.storage
				.from('avatars')
				.getPublicUrl(filePath);

			// 3. Actualizar en Base de Datos
			await lawyersService.update(abogado.id, { picture: publicUrl });

			// 4. Actualizar estado global/local
			updateUser({ picture: publicUrl });
			
			setNotificacion({ tipo: 'success', mensaje: 'Foto de perfil actualizada correctamente' });
		} catch (error: any) {
			console.error('Error al subir foto:', error);
			setNotificacion({ tipo: 'error', mensaje: `Error: ${error.message || 'No se pudo subir la foto'}` });
		}
	};

	useEffect(() => {
		if (notificacion) {
			const timer = setTimeout(() => setNotificacion(null), 3000);
			return () => clearTimeout(timer);
		}
	}, [notificacion]);

	// Función para guardar los cambios
	const guardarCambios = async () => {
		setGuardando(true);

		try {
			await lawyersService.update(abogado.id, {
				nombre: datosEditados.nombre,
				telefono: datosEditados.telefono,
				especialidad: datosEditados.especialidad as any,
			});

			// Actualizar estado global del auth para que se vea en todo el panel
			updateUser({ 
				nombre: datosEditados.nombre,
				telefono: datosEditados.telefono,
				especialidad: datosEditados.especialidad as any
			});

			setExito(true);
			setEditando(false);

			setTimeout(() => {
				setExito(false);
			}, 3000);
		} catch (error) {
			console.error('Error al guardar cambios:', error);
			setNotificacion({ tipo: 'error', mensaje: 'Error al actualizar el perfil' });
		} finally {
			setGuardando(false);
		}
	};

	const handlePasswordChange = async (e: React.FormEvent) => {
		e.preventDefault();
		if (passwords.nueva !== passwords.confirmar) {
			setNotificacion({ tipo: 'error', mensaje: 'Las nuevas contraseñas no coinciden' });
			return;
		}
		if (passwords.nueva.length < 6) {
			setNotificacion({ tipo: 'error', mensaje: 'La contraseña debe tener al menos 6 caracteres' });
			return;
		}

		try {
			await changePassword(passwords.actual, passwords.nueva);
			setNotificacion({ tipo: 'success', mensaje: 'Contraseña actualizada correctamente' });
			setPasswords({ actual: '', nueva: '', confirmar: '' });
		} catch (error: any) {
			setNotificacion({ tipo: 'error', mensaje: error.message || 'Error al actualizar contraseña' });
		}
	};

	return (
		<div className="space-y-6">
			{/* Notificación */}
			{notificacion && (
				<div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right-4 ${notificacion.tipo === 'error' ? 'bg-rose-500' : 'bg-azul-primario'} text-white`}>
					<FiCheck />
					<span>{notificacion.mensaje}</span>
				</div>
			)}

			<input 
				type="file" 
				id="foto-input" 
				className="hidden" 
				accept="image/*"
				onChange={handleFileChange}
			/>
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
							<div className="relative w-40 h-40 rounded-full overflow-hidden mb-4 bg-gray-100 flex items-center justify-center">
								<Image
									src={abogado.picture || userImage}
									alt={abogado.nombre}
									fill
									className="object-cover"
									unoptimized={!!abogado.picture}
								/>
							</div>

							<button 
								onClick={handleFotoClick}
								className="text-sm text-azul-primario hover:underline">
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

			{/* Nueva sección de seguridad */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="p-6 border-b border-gray-100 flex items-center gap-3">
					<div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
						<FiShield size={20} />
					</div>
					<div>
						<h3 className="text-lg font-bold text-gray-800">Seguridad de la cuenta</h3>
						<p className="text-xs text-gray-500">Cambia tu contraseña para mantener tu cuenta segura</p>
					</div>
				</div>
				<div className="p-6">
					<form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								<FiLock className="inline-block mr-2 text-gray-400" />
								Contraseña actual
							</label>
							<input
								type="password"
								required
								value={passwords.actual}
								onChange={(e) => setPasswords({...passwords, actual: e.target.value})}
								className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
								placeholder="••••••••"
							/>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Nueva contraseña
								</label>
								<input
									type="password"
									required
									value={passwords.nueva}
									onChange={(e) => setPasswords({...passwords, nueva: e.target.value})}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
									placeholder="••••••••"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-1">
									Confirmar nueva contraseña
								</label>
								<input
									type="password"
									required
									value={passwords.confirmar}
									onChange={(e) => setPasswords({...passwords, confirmar: e.target.value})}
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
									placeholder="••••••••"
								/>
							</div>
						</div>
						<div className="pt-2">
							<button
								type="submit"
								disabled={cambiandopassword}
								className="px-6 py-2.5 bg-rose-600 text-white rounded-lg font-bold text-sm uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 disabled:opacity-50"
							>
								{cambiandopassword ? 'Actualizando...' : 'Actualizar contraseña'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
