import { useState } from 'react';
import {
	FiSave,
	FiRefreshCw,
	FiAlertTriangle,
	FiCheck,
	FiDownload,
} from 'react-icons/fi';

export default function ConfiguracionPanel() {
	// Estados para los diferentes grupos de configuración
	const [configuracionGeneral, setConfiguracionGeneral] = useState({
		nombrePlataforma: 'VirtuAbogado',
		emailContacto: 'contacto@virtuabogado.com',
		telefonoContacto: '+34 900 123 456',
		direccion: 'Calle Ejemplo 123, 28001 Madrid',
	});

	const [configuracionNotificaciones, setConfiguracionNotificaciones] =
		useState({
			emailNuevoCaso: true,
			emailAsignacionAbogado: true,
			emailPago: true,
			emailCasoCompletado: true,
			smsNuevoCaso: false,
			smsAsignacionAbogado: false,
			smsPago: true,
			smsCasoCompletado: false,
		});

	const [configuracionPagos, setConfiguracionPagos] = useState({
		comisionPlataforma: 15,
		diasPagoAbogados: 15,
		metodoPagoPrincipal: 'stripe',
		ivaAplicado: 21,
	});

	const [guardando, setGuardando] = useState(false);
	const [mensajeExito, setMensajeExito] = useState('');

	// Manejadores de cambio para cada grupo de configuración
	const handleChangeGeneral = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setConfiguracionGeneral({
			...configuracionGeneral,
			[name]: value,
		});
	};

	const handleChangeNotificaciones = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const { name, checked } = e.target;
		setConfiguracionNotificaciones({
			...configuracionNotificaciones,
			[name]: checked,
		});
	};

	const handleChangePagos = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setConfiguracionPagos({
			...configuracionPagos,
			[name]:
				name === 'comisionPlataforma' ||
				name === 'diasPagoAbogados' ||
				name === 'ivaAplicado'
					? parseInt(value)
					: value,
		});
	};

	// Función para guardar la configuración
	const guardarConfiguracion = async () => {
		setGuardando(true);
		setMensajeExito('');

		try {
			// Aquí iría la llamada a la API para guardar la configuración
			// Por ahora, simulamos una respuesta exitosa después de 1 segundo
			await new Promise((resolve) => setTimeout(resolve, 1000));

			setMensajeExito('Configuración guardada correctamente');

			// Ocultar el mensaje después de 3 segundos
			setTimeout(() => {
				setMensajeExito('');
			}, 3000);
		} catch (error) {
			console.error('Error al guardar la configuración:', error);
		} finally {
			setGuardando(false);
		}
	};

	return (
		<div className="space-y-8">
			{/* Mensaje de éxito */}
			{mensajeExito && (
				<div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center">
					<FiCheck className="text-green-500 mr-2" />
					<span>{mensajeExito}</span>
				</div>
			)}

			{/* Configuración general */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-medium text-gray-900">
						Configuración general
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Información básica de la plataforma
					</p>
				</div>

				<div className="p-6 space-y-4">
					<div>
						<label
							htmlFor="nombrePlataforma"
							className="block text-sm font-medium text-gray-700 mb-1">
							Nombre de la plataforma
						</label>
						<input
							type="text"
							id="nombrePlataforma"
							name="nombrePlataforma"
							value={configuracionGeneral.nombrePlataforma}
							onChange={handleChangeGeneral}
							className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
						/>
					</div>

					<div>
						<label
							htmlFor="emailContacto"
							className="block text-sm font-medium text-gray-700 mb-1">
							Email de contacto
						</label>
						<input
							type="email"
							id="emailContacto"
							name="emailContacto"
							value={configuracionGeneral.emailContacto}
							onChange={handleChangeGeneral}
							className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
						/>
					</div>

					<div>
						<label
							htmlFor="telefonoContacto"
							className="block text-sm font-medium text-gray-700 mb-1">
							Teléfono de contacto
						</label>
						<input
							type="text"
							id="telefonoContacto"
							name="telefonoContacto"
							value={configuracionGeneral.telefonoContacto}
							onChange={handleChangeGeneral}
							className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
						/>
					</div>

					<div>
						<label
							htmlFor="direccion"
							className="block text-sm font-medium text-gray-700 mb-1">
							Dirección
						</label>
						<textarea
							id="direccion"
							name="direccion"
							rows={2}
							value={configuracionGeneral.direccion}
							onChange={handleChangeGeneral}
							className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
						/>
					</div>
				</div>
			</div>

			{/* Configuración de notificaciones */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-medium text-gray-900">Notificaciones</h2>
					<p className="mt-1 text-sm text-gray-500">
						Configura las notificaciones automáticas
					</p>
				</div>

				<div className="p-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<h3 className="text-sm font-medium text-gray-900 mb-3">
								Notificaciones por email
							</h3>
							<div className="space-y-3">
								<div className="flex items-center">
									<input
										type="checkbox"
										id="emailNuevoCaso"
										name="emailNuevoCaso"
										checked={configuracionNotificaciones.emailNuevoCaso}
										onChange={handleChangeNotificaciones}
										className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
									/>
									<label
										htmlFor="emailNuevoCaso"
										className="ml-2 block text-sm text-gray-700">
										Nuevo caso registrado
									</label>
								</div>

								<div className="flex items-center">
									<input
										type="checkbox"
										id="emailAsignacionAbogado"
										name="emailAsignacionAbogado"
										checked={configuracionNotificaciones.emailAsignacionAbogado}
										onChange={handleChangeNotificaciones}
										className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
									/>
									<label
										htmlFor="emailAsignacionAbogado"
										className="ml-2 block text-sm text-gray-700">
										Asignación de abogado
									</label>
								</div>

								<div className="flex items-center">
									<input
										type="checkbox"
										id="emailPago"
										name="emailPago"
										checked={configuracionNotificaciones.emailPago}
										onChange={handleChangeNotificaciones}
										className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
									/>
									<label
										htmlFor="emailPago"
										className="ml-2 block text-sm text-gray-700">
										Pago recibido
									</label>
								</div>

								<div className="flex items-center">
									<input
										type="checkbox"
										id="emailCasoCompletado"
										name="emailCasoCompletado"
										checked={configuracionNotificaciones.emailCasoCompletado}
										onChange={handleChangeNotificaciones}
										className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
									/>
									<label
										htmlFor="emailCasoCompletado"
										className="ml-2 block text-sm text-gray-700">
										Caso completado
									</label>
								</div>
							</div>
						</div>

						<div>
							<h3 className="text-sm font-medium text-gray-900 mb-3">
								Notificaciones por SMS
							</h3>
							<div className="space-y-3">
								<div className="flex items-center">
									<input
										type="checkbox"
										id="smsNuevoCaso"
										name="smsNuevoCaso"
										checked={configuracionNotificaciones.smsNuevoCaso}
										onChange={handleChangeNotificaciones}
										className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
									/>
									<label
										htmlFor="smsNuevoCaso"
										className="ml-2 block text-sm text-gray-700">
										Nuevo caso registrado
									</label>
								</div>

								<div className="flex items-center">
									<input
										type="checkbox"
										id="smsAsignacionAbogado"
										name="smsAsignacionAbogado"
										checked={configuracionNotificaciones.smsAsignacionAbogado}
										onChange={handleChangeNotificaciones}
										className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
									/>
									<label
										htmlFor="smsAsignacionAbogado"
										className="ml-2 block text-sm text-gray-700">
										Asignación de abogado
									</label>
								</div>

								<div className="flex items-center">
									<input
										type="checkbox"
										id="smsPago"
										name="smsPago"
										checked={configuracionNotificaciones.smsPago}
										onChange={handleChangeNotificaciones}
										className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
									/>
									<label
										htmlFor="smsPago"
										className="ml-2 block text-sm text-gray-700">
										Pago recibido
									</label>
								</div>

								<div className="flex items-center">
									<input
										type="checkbox"
										id="smsCasoCompletado"
										name="smsCasoCompletado"
										checked={configuracionNotificaciones.smsCasoCompletado}
										onChange={handleChangeNotificaciones}
										className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
									/>
									<label
										htmlFor="smsCasoCompletado"
										className="ml-2 block text-sm text-gray-700">
										Caso completado
									</label>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Configuración de pagos */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-medium text-gray-900">
						Configuración de pagos
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Ajustes relacionados con pagos y facturación
					</p>
				</div>

				<div className="p-6 space-y-4">
					<div>
						<label
							htmlFor="comisionPlataforma"
							className="block text-sm font-medium text-gray-700 mb-1">
							Comisión de la plataforma (%)
						</label>
						<input
							type="number"
							id="comisionPlataforma"
							name="comisionPlataforma"
							min="0"
							max="100"
							value={configuracionPagos.comisionPlataforma}
							onChange={handleChangePagos}
							className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
						/>
					</div>

					<div>
						<label
							htmlFor="diasPagoAbogados"
							className="block text-sm font-medium text-gray-700 mb-1">
							Días para pago a abogados
						</label>
						<input
							type="number"
							id="diasPagoAbogados"
							name="diasPagoAbogados"
							min="1"
							max="90"
							value={configuracionPagos.diasPagoAbogados}
							onChange={handleChangePagos}
							className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
						/>
						<p className="mt-1 text-xs text-gray-500">
							Número de días después de completar un caso para realizar el pago
							al abogado.
						</p>
					</div>

					<div>
						<label
							htmlFor="metodoPagoPrincipal"
							className="block text-sm font-medium text-gray-700 mb-1">
							Método de pago principal
						</label>
						<select
							id="metodoPagoPrincipal"
							name="metodoPagoPrincipal"
							value={configuracionPagos.metodoPagoPrincipal}
							onChange={handleChangePagos}
							className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm">
							<option value="stripe">Stripe</option>
							<option value="paypal">PayPal</option>
							<option value="transferencia">Transferencia bancaria</option>
							<option value="tarjeta">Tarjeta de crédito/débito</option>
						</select>
					</div>

					<div>
						<label
							htmlFor="ivaAplicado"
							className="block text-sm font-medium text-gray-700 mb-1">
							IVA aplicado (%)
						</label>
						<input
							type="number"
							id="ivaAplicado"
							name="ivaAplicado"
							min="0"
							max="30"
							value={configuracionPagos.ivaAplicado}
							onChange={handleChangePagos}
							className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
						/>
					</div>

					<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
						<div className="flex">
							<div className="flex-shrink-0">
								<FiAlertTriangle className="h-5 w-5 text-yellow-400" />
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-medium text-yellow-800">
									Información importante
								</h3>
								<div className="mt-2 text-sm text-yellow-700">
									<p>
										Los cambios en la configuración de pagos pueden afectar a
										las transacciones en curso. Se recomienda realizar estos
										cambios fuera del horario comercial.
									</p>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Botones de acción */}
			<div className="flex justify-end space-x-4">
				<button
					type="button"
					className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario"
					onClick={() => window.location.reload()}>
					<FiRefreshCw className="mr-2 -ml-1 h-5 w-5" />
					Restablecer
				</button>
				<button
					type="button"
					className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario"
					onClick={guardarConfiguracion}
					disabled={guardando}>
					{guardando ? (
						<>
							<svg
								className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24">
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							Guardando...
						</>
					) : (
						<>
							<FiSave className="mr-2 -ml-1 h-5 w-5" />
							Guardar cambios
						</>
					)}
				</button>
			</div>

			{/* Sección de copia de seguridad */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200">
					<h2 className="text-lg font-medium text-gray-900">
						Copia de seguridad
					</h2>
					<p className="mt-1 text-sm text-gray-500">
						Gestiona las copias de seguridad de la plataforma
					</p>
				</div>

				<div className="p-6 space-y-4">
					<div className="flex justify-between items-center">
						<div>
							<h3 className="text-sm font-medium text-gray-900">
								Última copia de seguridad
							</h3>
							<p className="text-sm text-gray-500 mt-1">
								15 de junio de 2023, 03:45 AM
							</p>
						</div>
						<div className="flex space-x-2">
							<button
								type="button"
								className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario">
								<FiDownload className="mr-2 -ml-1 h-4 w-4" />
								Descargar
							</button>
							<button
								type="button"
								className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario">
								<FiRefreshCw className="mr-2 -ml-1 h-4 w-4" />
								Crear nueva
							</button>
						</div>
					</div>

					<div className="border-t border-gray-200 pt-4">
						<h3 className="text-sm font-medium text-gray-900 mb-2">
							Programación de copias automáticas
						</h3>
						<div className="flex items-center mb-4">
							<input
								type="checkbox"
								id="copiasAutomaticas"
								name="copiasAutomaticas"
								checked={true}
								className="h-4 w-4 rounded border-gray-300 text-azul-primario focus:ring-azul-primario"
							/>
							<label
								htmlFor="copiasAutomaticas"
								className="ml-2 block text-sm text-gray-700">
								Activar copias de seguridad automáticas
							</label>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label
									htmlFor="frecuenciaCopia"
									className="block text-sm font-medium text-gray-700 mb-1">
									Frecuencia
								</label>
								<select
									id="frecuenciaCopia"
									name="frecuenciaCopia"
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
									defaultValue="diaria">
									<option value="diaria">Diaria</option>
									<option value="semanal">Semanal</option>
									<option value="mensual">Mensual</option>
								</select>
							</div>

							<div>
								<label
									htmlFor="horaCopia"
									className="block text-sm font-medium text-gray-700 mb-1">
									Hora
								</label>
								<select
									id="horaCopia"
									name="horaCopia"
									className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
									defaultValue="3">
									{[...Array(24)].map((_, i) => (
										<option
											key={i}
											value={i}>
											{i.toString().padStart(2, '0')}:00
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
