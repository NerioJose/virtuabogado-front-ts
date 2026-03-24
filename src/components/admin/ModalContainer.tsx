import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
	FiX,
	FiAlertTriangle,
	FiCheck,
	FiUser,
	FiUsers,
	FiBriefcase,
	FiDollarSign,
} from 'react-icons/fi';
// import { useLawyersStore } from '@/features/lawyers';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
import { Abogado, Cliente, Caso, Transaccion } from '@/types/index';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';

// Wrapper simple para propósitos de tipado en el render condicional
const ChatWindowSupervision = ({ orderId, className }: { orderId: string, className?: string }) => <ChatWindow orderId={orderId} className={className} />;

// Tipo unión para todos los posibles elementos (excluyendo null)
type ElementoModal = Abogado | Cliente | Caso | Transaccion;

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

// Tipo para el formulario con tipado más específico
type FormDataType = Record<
	string,
	string | number | boolean | Date | null | undefined
>;

// Tipo para los campos del formulario
type CampoFormulario = {
	key: string;
	label: string;
	type: string;
	required: boolean;
	options?: string[];
	readonly?: boolean;
};

interface ModalContainerProps {
	tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar';
	seccion: 'abogados' | 'clientes' | 'casos' | 'finanzas' | 'configuracion';
	elemento: ElementoModal | null;
	onClose: () => void;
	onSave?: (data: FormDataType) => Promise<void> | void;
}

// Función para obtener campos por sección
const obtenerCamposPorSeccion = (seccion: string) => {
	switch (seccion) {
		case 'abogados':
			return [
				{
					key: 'nombre',
					label: 'Nombre completo',
					type: 'text',
					required: true,
				},
				{ key: 'email', label: 'Email', type: 'email', required: true },
				{ key: 'telefono', label: 'Teléfono', type: 'tel', required: false },
				{
					key: 'especialidad',
					label: 'Especialidad',
					type: 'text',
					required: true,
				},
				{
					key: 'colegiatura',
					label: 'Número de colegiatura',
					type: 'text',
					required: true,
				},
			];
		case 'clientes':
			return [
				{
					key: 'nombre',
					label: 'Nombre completo',
					type: 'text',
					required: true,
				},
				{ key: 'email', label: 'Email', type: 'email', required: true },
				{ key: 'telefono', label: 'Teléfono', type: 'tel', required: true },
				{ key: 'direccion', label: 'Dirección', type: 'text', required: false },
				{ key: 'dni', label: 'DNI/RUC', type: 'text', required: false },
			];
		case 'casos':
			return [
				{
					key: 'numericId',
					label: 'ID de Orden',
					type: 'number',
					required: false,
					readonly: true,
				},
				{
					key: 'userName',
					label: 'Cliente',
					type: 'text',
					required: false,
					readonly: true,
				},
				{
					key: 'status',
					label: 'Estado',
					type: 'select',
					options: ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'],
					required: true,
				},
				{
					key: 'total',
					label: 'Monto Total',
					type: 'number',
					required: false,
					readonly: true,
				},
				{
					key: 'createdAt',
					label: 'Fecha de Creación',
					type: 'date',
					required: false,
					readonly: true,
				},
			];
		case 'finanzas':
			return [
				{
					key: 'numericId',
					label: 'ID de Transacción',
					type: 'number',
					required: false,
					readonly: true,
				},
				{
					key: 'userName',
					label: 'Cliente',
					type: 'text',
					required: false,
					readonly: true,
				},
				{
					key: 'total',
					label: 'Monto Total',
					type: 'number',
					required: false,
					readonly: true,
				},
				{
					key: 'status',
					label: 'Estado de Orden',
					type: 'select',
					options: ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'],
					required: true,
					readonly: true,
				},
				{
					key: 'createdAt',
					label: 'Fecha',
					type: 'date',
					required: false,
					readonly: true,
				},
			];
		default:
			return [];
	}
};

export default function ModalContainer({
	tipo,
	seccion,
	elemento,
	onClose,
	onSave,
}: ModalContainerProps) {
	// Estado para el formulario
	const [formData, setFormData] = useState<FormDataType>({});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [success, setSuccess] = useState(false);
	const [validationErrors, setValidationErrors] = useState<
		Record<string, string>
	>({});

	// Cargar datos del elemento si es edición o visualización
	useEffect(() => {
		if (
			elemento &&
			(tipo === 'editar' ||
				tipo === 'ver' ||
				tipo === 'eliminar' ||
				tipo === 'asignar')
		) {
			// Clonar y formatear fechas para inputs HTML
			const initialForm: any = { ...elemento };

			// Mapear campos para ver cuáles son de tipo 'date'
			const campos = obtenerCamposPorSeccion(seccion);
			campos.forEach(campo => {
				if (campo.type === 'date' && initialForm[campo.key]) {
					try {
						const date = new Date(initialForm[campo.key]);
						if (!isNaN(date.getTime())) {
							initialForm[campo.key] = date.toISOString().split('T')[0];
						}
					} catch (e) {
						console.warn(`Error formatting date for field ${campo.key}:`, e);
					}
				}
			});

			setFormData(initialForm);
		} else if (tipo === 'crear') {
			// Inicializar formulario vacío para crear
			const campos = obtenerCamposPorSeccion(seccion);
			const initialData: FormDataType = {};
			campos.forEach((campo) => {
				initialData[campo.key] = campo.type === 'number' ? 0 : '';
			});
			setFormData(initialData);
		}
	}, [elemento, tipo, seccion]);

	// Función para manejar cambios en el formulario
	const handleInputChange = useCallback(
		(key: string, value: string | number | boolean) => {
			setFormData((prev) => ({
				...prev,
				[key]: value,
			}));

			// Limpiar error de validación si existe
			if (validationErrors[key]) {
				setValidationErrors((prev) => {
					const newErrors = { ...prev };
					delete newErrors[key];
					return newErrors;
				});
			}
		},
		[validationErrors]
	);

	// Función para validar el formulario
	const validateForm = useCallback((): boolean => {
		const campos = obtenerCamposPorSeccion(seccion);
		const errors: Record<string, string> = {};

		// Para 'asignar', solo validamos que haya un abogado seleccionado
		if (tipo === 'asignar') {
			if (!formData.lawyerId) {
				errors.lawyerId = 'Debe seleccionar un abogado';
			}
			setValidationErrors(errors);
			return Object.keys(errors).length === 0;
		}

		campos.forEach((campo) => {
			if (campo.required) {
				const value = formData[campo.key];
				if (!value || (typeof value === 'string' && value.trim() === '')) {
					errors[campo.key] = `${campo.label} es obligatorio`;
				}
			}

			// Validaciones específicas
			if (campo.type === 'email' && formData[campo.key]) {
				const email = formData[campo.key] as string;
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(email)) {
					errors[campo.key] = 'Formato de email inválido';
				}
			}

			if (campo.type === 'number' && formData[campo.key] !== undefined) {
				const value = Number(formData[campo.key]);
				if (isNaN(value) || value < 0) {
					errors[campo.key] = 'Debe ser un número válido mayor o igual a 0';
				}
			}
		});

		setValidationErrors(errors);
		return Object.keys(errors).length === 0;
	}, [formData, seccion]);

	// Función para enviar el formulario
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (tipo === 'ver') return;

		if (!validateForm()) {
			setError('Por favor, corrige los errores en el formulario');
			return;
		}

		setLoading(true);
		setError('');

		try {
			console.log('📝 ModalContainer handleSubmit:', { tipo, formData });
			if (onSave) {
				await onSave(formData);
			} else {
				// Simulación de API call
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			setSuccess(true);

			// Cerrar el modal después de 1.5 segundos
			setTimeout(() => {
				onClose();
			}, 1500);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: 'Ocurrió un error al procesar la solicitud. Por favor, inténtalo de nuevo.'
			);
		} finally {
			setLoading(false);
		}
	};

	// Función para confirmar eliminación
	const confirmarEliminacion = async () => {
		setLoading(true);
		setError('');

		try {
			console.log('🗑️ ModalContainer confirmarEliminacion:', { id: elemento?.id, elemento });
			if (onSave) {
				await onSave({ id: elemento?.id });
			} else {
				// Simulación de API call
				await new Promise((resolve) => setTimeout(resolve, 1000));
			}

			setSuccess(true);

			// Cerrar el modal después de 1.5 segundos
			setTimeout(() => {
				onClose();
			}, 1500);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: 'Ocurrió un error al eliminar. Por favor, inténtalo de nuevo.'
			);
		} finally {
			setLoading(false);
		}
	};

	// Obtener título del modal según tipo y sección
	const obtenerTitulo = () => {
		const acciones = {
			crear: 'Crear nuevo',
			editar: 'Editar',
			eliminar: 'Eliminar',
			ver: 'Detalles de',
			asignar: 'Asignar',
		};

		const entidades = {
			abogados: 'abogado',
			clientes: 'cliente',
			casos: 'caso',
			finanzas: 'transacción',
			configuracion: 'configuración',
		};

		return `${acciones[tipo]} ${entidades[seccion]}`;
	};

	// Obtener icono según la sección
	const obtenerIcono = () => {
		const iconos = {
			abogados: <FiUser className="h-6 w-6" />,
			clientes: <FiUsers className="h-6 w-6" />,
			casos: <FiBriefcase className="h-6 w-6" />,
			finanzas: <FiDollarSign className="h-6 w-6" />,
			configuracion: <FiX className="h-6 w-6" />,
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
					<button
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
									{obtenerCamposPorSeccion(seccion).map(renderCampo)}
								</div>
							</form>

							{/* CHAT DE SUPERVISIÓN PARA ADMIN (SOLO EN MODO VER) */}
							{tipo === 'ver' && (seccion === 'casos' || seccion === 'finanzas') && (elemento as any)?.id && (
								<div className="mt-6 border-t pt-6">
									<div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100">
										<h4 className="font-bold text-azul-primario mb-3 flex items-center">
											<FiBriefcase className="mr-2" /> Servicios Contratados
										</h4>
										<div className="space-y-2">
											{(elemento as any)?.items?.map((item: any, i: number) => (
												<div key={i} className="flex justify-between items-center bg-white p-3 rounded border border-gray-100 shadow-sm">
													<span className="text-sm font-medium text-gray-700">{item.serviceName}</span>
													<span className="text-sm font-bold text-azul-primario">${item.price.toLocaleString()}</span>
												</div>
											))}
										</div>
									</div>

									<h4 className="font-bold text-gray-800 mb-3 flex items-center">
										<span className="mr-2">💬</span> Chat de Supervisión
									</h4>
									<div className="h-[500px] shadow-inner rounded-lg overflow-hidden border border-gray-200">
										<ChatWindowSupervision orderId={(elemento as any).id} className="h-full" />
									</div>
								</div>
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
