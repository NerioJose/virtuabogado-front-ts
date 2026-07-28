'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
	FiX,
	FiAlertTriangle,
	FiCheck,
	FiUser,
	FiUsers,
	FiBriefcase,
	FiDollarSign,
	FiSettings,
	FiEye,
	FiEyeOff,
} from 'react-icons/fi';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
import { Abogado, Cliente, Caso, Transaccion } from '@/types/index';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import AdminSupervisionTabs from './AdminSupervisionTabs';
import { useModalContainer, CampoFormulario, FormDataType } from './hooks/useModalContainer';

// Tipo unión para todos los posibles elementos (excluyendo null)
type ElementoModal = Abogado | Cliente | Caso | Transaccion;

export interface ModalContainerProps {
	tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar';
	seccion: 'abogados' | 'clientes' | 'casos' | 'finanzas' | 'configuracion';
	elemento?: ElementoModal;
	onClose: () => void;
	onSave?: (data: any) => void;
}

const LawyerSelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
	const { data: lawyers = [], isLoading } = useLawyers();

	if (isLoading) return <div className="text-sm text-gray-500">Cargando abogados...</div>;

	return (
		<select
			className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-azul-primario focus:border-azul-primario bg-white"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			required
		>
			<option value="">-- Seleccione un abogado --</option>
			{lawyers.map(lawyer => (
				<option key={lawyer.id} value={lawyer.id}>
					{lawyer.nombre} ({lawyer.especialidad})
				</option>
			))}
		</select>
	);
};



export default function ModalContainer({
	tipo,
	seccion,
	elemento,
	onClose,
	onSave,
}: ModalContainerProps) {
	const {
		formData,
		loading,
		error,
		success,
		validationErrors,
		handleInputChange,
		handleSubmit,
		confirmarEliminacion,
		campos,
	} = useModalContainer(tipo, seccion, elemento as any, onClose, onSave);

	const [showPassword, setShowPassword] = useState(false);

	// Obtener título del modal según tipo y sección
	const obtenerTitulo = () => {
		const acciones: Record<string, string> = {
			crear: 'Crear nuevo',
			editar: 'Editar',
			eliminar: 'Eliminar',
			ver: 'Detalles de',
			asignar: 'Asignar',
		};

		const entidades: Record<string, string> = {
			abogados: 'abogado',
			clientes: 'cliente',
			casos: 'caso',
			finanzas: 'transacción',
			configuracion: 'configuración',
			dashboard: 'caso',
		};

		return `${acciones[tipo]} ${entidades[seccion]}`;
	};

	// Obtener icono según la sección
	const obtenerIcono = () => {
		const iconos: Record<string, React.ReactNode> = {
			abogados: <FiUser className="h-6 w-6" />,
			clientes: <FiUsers className="h-6 w-6" />,
			casos: <FiBriefcase className="h-6 w-6" />,
			finanzas: <FiDollarSign className="h-6 w-6" />,
			configuracion: <FiSettings className="h-6 w-6" />,
			dashboard: <FiBriefcase className="h-6 w-6" />,
		};

		return iconos[seccion] || <FiX className="h-6 w-6" />;
	};

	// Renderizar campo del formulario
	const renderCampo = (campo: CampoFormulario) => {
		const value = formData[campo.key] || (campo.type === 'number' ? 0 : '');
		const hasError = validationErrors[campo.key];
		const isReadonly = tipo === 'ver' || campo.readonly;

		const baseClasses = `w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-azul-primario focus:border-azul-primario ${hasError ? 'border-red-300' : 'border-gray-300'
			} ${isReadonly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`;

		switch (campo.type) {
			case 'textarea':
				return (
					<div
						key={campo.key}
						className="space-y-1">
						<label className="block text-sm font-medium text-gray-700">
							{campo.label}
							{campo.required && <span className="text-red-500 ml-1">*</span>}
						</label>
						<textarea
							title={campo.label}
							placeholder={`Ingrese ${campo.label.toLowerCase()}`}
							value={value as string}
							onChange={(e) => handleInputChange(campo.key, e.target.value)}
							className={`${baseClasses} resize-none`}
							rows={3}
							readOnly={isReadonly}
							required={campo.required}
						/>
						{hasError && <p className="text-sm text-red-600">{hasError}</p>}
					</div>
				);

			case 'select':
				return (
					<div
						key={campo.key}
						className="space-y-1">
						<label className="block text-sm font-medium text-gray-700">
							{campo.label}
							{campo.required && <span className="text-red-500 ml-1">*</span>}
						</label>
						<select
							title={campo.label}
							value={value as string}
							onChange={(e) => handleInputChange(campo.key, e.target.value)}
							className={baseClasses}
							disabled={isReadonly}
							required={campo.required}>
							<option value="">Seleccionar...</option>
							{campo.options?.map((option: string) => {
								let display = option.charAt(0).toUpperCase() + option.slice(1).toLowerCase();
								if (option === 'EN_PROGRESO') display = 'En progreso';
								return (
									<option key={option} value={option}>
										{display}
									</option>
								);
							})}
						</select>
						{hasError && <p className="text-sm text-red-600">{hasError}</p>}
					</div>
				);

			case 'number':
				return (
					<div
						key={campo.key}
						className="space-y-1">
						<label className="block text-sm font-medium text-gray-700">
							{campo.label}
							{campo.required && <span className="text-red-500 ml-1">*</span>}
						</label>
						<input
							title={campo.label}
							placeholder={`Ingrese ${campo.label.toLowerCase()}`}
							type="number"
							value={value as number}
							onChange={(e) =>
								handleInputChange(campo.key, parseFloat(e.target.value) || 0)
							}
							className={baseClasses}
							readOnly={isReadonly}
							required={campo.required}
							min="0"
							step="0.01"
						/>
						{hasError && <p className="text-sm text-red-600">{hasError}</p>}
					</div>
				);

			case 'password':
				return (
					<div
						key={campo.key}
						className="space-y-1 relative">
						<label className="block text-sm font-medium text-gray-700">
							{campo.label}
							{campo.required && <span className="text-red-500 ml-1">*</span>}
						</label>
						<div className="relative">
							<input
								title={campo.label}
								placeholder={`Ingrese ${campo.label.toLowerCase()}`}
								type={showPassword ? 'text' : 'password'}
								value={value as string}
								onChange={(e) => handleInputChange(campo.key, e.target.value)}
								className={`${baseClasses} pr-10`}
								readOnly={isReadonly}
								required={campo.required}
							/>
							<button
								type="button"
								onClick={() => setShowPassword(!showPassword)}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
							>
								{showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
							</button>
						</div>
						{hasError && <p className="text-sm text-red-600">{hasError}</p>}
					</div>
				);

			default:
				return (
					<div
						key={campo.key}
						className="space-y-1">
						<label className="block text-sm font-medium text-gray-700">
							{campo.label}
							{campo.required && <span className="text-red-500 ml-1">*</span>}
						</label>
						<input
							title={campo.label}
							placeholder={`Ingrese ${campo.label.toLowerCase()}`}
							type={campo.type}
							value={value as string}
							onChange={(e) => handleInputChange(campo.key, e.target.value)}
							className={baseClasses}
							readOnly={isReadonly}
							required={campo.required}
						/>
						{hasError && <p className="text-sm text-red-600">{hasError}</p>}
					</div>
				);
		}
	};

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50 flex items-center justify-center p-4">
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.9 }}
				transition={{ duration: 0.2 }}
				className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[92vh] overflow-hidden">
				{/* Cabecera del modal */}
				<div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
					<div className="flex items-center space-x-3">
						<div className="text-azul-primario">{obtenerIcono()}</div>
						<h2 className="text-lg font-medium text-gray-900">
							{obtenerTitulo()}
						</h2>
					</div>
					<button type="button"
						onClick={onClose}
						className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-azul-primario rounded-md p-1"
						aria-label="Cerrar modal">
						<FiX className="h-5 w-5" />
					</button>
				</div>

				{/* Contenido del modal */}
				<div className="px-6 py-4 max-h-[75vh] overflow-y-auto">
					{success ? (
						<div className="flex items-center justify-center py-8">
							<div className="text-center">
								<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
									<FiCheck className="h-6 w-6 text-green-600" />
								</div>
								<h3 className="text-lg font-medium text-gray-900 mb-2">
									{tipo === 'eliminar'
										? 'Eliminado correctamente'
										: 'Guardado correctamente'}
								</h3>
								<p className="text-sm text-gray-500">
									{tipo === 'eliminar'
										? 'El elemento ha sido eliminado de la base de datos.'
										: 'Los cambios han sido guardados correctamente.'}
								</p>
							</div>
						</div>
					) : tipo === 'eliminar' ? (
						<div className="py-4">
							<div className="flex items-center justify-center mb-4">
								<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
									<FiAlertTriangle className="h-6 w-6 text-red-600" />
								</div>
							</div>
							<h3 className="text-lg font-medium text-center text-gray-900 mb-2">
								¿Estás seguro de que deseas eliminar este elemento?
							</h3>
							<p className="text-sm text-center text-gray-500 mb-6">
								Esta acción no se puede deshacer. Se eliminarán permanentemente
								los datos asociados.
							</p>

							{/* Mostrar información del elemento a eliminar */}
							{elemento && (
								<div className="bg-gray-50 p-4 rounded-md mb-4">
									<h4 className="font-medium text-gray-900 mb-2">
										Información del elemento:
									</h4>
									<div className="text-sm text-gray-600 space-y-1">
										{Object.entries(elemento)
											.slice(0, 3)
											.map(([key, value]) => (
												<div
													key={key}
													className="flex">
													<span className="font-medium capitalize w-20">
														{key}:
													</span>
													<span>{String(value)}</span>
												</div>
											))}
									</div>
								</div>
							)}

							{error && (
								<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
									{error}
								</div>
							)}

						</div>
					) : tipo === 'asignar' ? (
						<div>
							<h3 className="text-lg font-medium text-gray-900 mb-4">
								Asignar Abogado al Caso
							</h3>
							<p className="text-sm text-gray-500 mb-6">
								Selecciona un abogado de la lista para gestionar este caso.
								El abogado recibirá una notificación y acceso a los detalles.
							</p>

							<form id="modal-form" onSubmit={handleSubmit}>
								{error && (
									<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
										{error}
									</div>
								)}
								<div className="space-y-4">
									<div className="space-y-1">
										<label className="block text-sm font-medium text-gray-700">
											Seleccionar Abogado
										</label>
										<LawyerSelect
											value={formData.lawyerId as string || ''}
											onChange={(val) => handleInputChange('lawyerId', val)}
										/>
									</div>
									{(elemento as any)?.lawyerId && (
										<div className="space-y-1">
											<label className="block text-sm font-medium text-gray-700">
												Motivo de Reasignación <span className="text-gray-400 font-normal">(opcional)</span>
											</label>
											<textarea
												value={formData.reason as string || ''}
												onChange={(e) => handleInputChange('reason', e.target.value)}
												rows={3}
												className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-azul-primario focus:border-azul-primario"
												placeholder="Ej: El abogado solicitó la baja del caso, conflicto de horarios, especialización..."
											/>
										</div>
									)}
								</div>
							</form>
						</div>

					) : (
						<div>
							<form
								onSubmit={handleSubmit}
								id="modal-form">
								{error && (
									<div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
										{error}
									</div>
								)}

								<div className="space-y-4">
									{campos.map(renderCampo)}
								</div>
							</form>

							{/* TABS DE SUPERVISIÓN PARA ADMIN (SOLO EN MODO VER) */}
							{tipo === 'ver' && (seccion === 'casos' || seccion === 'finanzas' || seccion === 'dashboard') && (elemento as any)?.id && (
								<AdminSupervisionTabs orderId={(elemento as any).id} elemento={elemento} />
							)}
						</div>
					)}
				</div>

				{/* Pie del modal con botones de acción */}
				<div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
					{!success && (
						<>
							<button
								type="button"
								onClick={onClose}
								className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario">
								Cancelar
							</button>

							{tipo === 'eliminar' ? (
								<button
									type="button"
									onClick={confirmarEliminacion}
									disabled={loading}
									className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed">
									{loading ? 'Eliminando...' : 'Eliminar'}
								</button>
							) : (
								tipo !== 'ver' && (
									<button
										type="submit"
										form="modal-form"
										disabled={loading}
										className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario disabled:opacity-50 disabled:cursor-not-allowed">
										{loading ? 'Guardando...' : 'Guardar'}
									</button>
								)
							)}
						</>
					)}
				</div>
			</motion.div>
		</div>
	);
}
