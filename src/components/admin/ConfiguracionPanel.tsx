import { useState, useMemo, useEffect } from 'react';
import {
	FiSave,
	FiRefreshCw,
	FiAlertTriangle,
	FiCheck,
	FiDownload,
	FiDollarSign,
	FiTrendingUp,
	FiAlertCircle,
} from 'react-icons/fi';
import { useFinancialSettings, useUpdateFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';
import { financialSettingsService } from '@/features/financial-settings/services/financial-settings.service';
import { useOrders } from '@/features/orders/hooks/useOrders';

// Componente para configuración financiera
function FinancialSettingsSection() {
	const { data: financialSettings, isLoading: loadingSettings } = useFinancialSettings();
	const { data: orders = [] } = useOrders();
	const updateSettings = useUpdateFinancialSettings();

	// Estados locales para edición - siempre con valores definidos
	const [lawyerCommission, setLawyerCommission] = useState<number>(70);
	const [operationalCosts, setOperationalCosts] = useState<number>(10);
	const [isSaving, setIsSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState('');

	// Sincronizar con datos del servidor cuando se carguen
	useEffect(() => {
		if (financialSettings) {
			setLawyerCommission(financialSettings.lawyerCommissionPercentage);
			setOperationalCosts(financialSettings.operationalCostsPercentage);
		}
	}, [financialSettings]);


	// Validaciones en tiempo real
	const validation = useMemo(() => {
		return financialSettingsService.validateSettings({
			lawyerCommissionPercentage: lawyerCommission,
			operationalCostsPercentage: operationalCosts,
		});
	}, [lawyerCommission, operationalCosts]);

	// Preview con datos reales
	const previewData = useMemo(() => {
		const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
		return financialSettingsService.calculatePreview(
			totalRevenue,
			lawyerCommission,
			operationalCosts
		);
	}, [orders, lawyerCommission, operationalCosts]);

	const handleSave = async () => {
		if (!validation.isValid) return;

		setIsSaving(true);
		setSaveMessage('');

		try {
			await updateSettings.mutateAsync({
				lawyerCommissionPercentage: lawyerCommission,
				operationalCostsPercentage: operationalCosts,
			});
			setSaveMessage('Configuración financiera guardada correctamente');
			setTimeout(() => setSaveMessage(''), 3000);
		} catch (error) {
			console.error('Error saving financial settings:', error);
			setSaveMessage('Error al guardar la configuración');
		} finally {
			setIsSaving(false);
		}
	};

	if (loadingSettings) {
		return (
			<div className="bg-white rounded-lg shadow-sm overflow-hidden p-6">
				<div className="animate-pulse">
					<div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
					<div className="h-32 bg-gray-200 rounded"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow-sm overflow-hidden">
			<div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
				<div className="flex items-center">
					<FiDollarSign className="text-green-600 text-2xl mr-3" />
					<div>
						<h2 className="text-lg font-medium text-gray-900">
							Configuración Financiera
						</h2>
						<p className="mt-1 text-sm text-gray-500">
							Define los porcentajes de comisiones y gastos operativos
						</p>
					</div>
				</div>
			</div>

			<div className="p-6">
				{/* Mensajes de éxito/error */}
				{saveMessage && (
					<div className={`mb-4 p-3 rounded-lg flex items-center ${saveMessage.includes('Error')
						? 'bg-red-50 border border-red-200 text-red-700'
						: 'bg-green-50 border border-green-200 text-green-700'
						}`}>
						<FiCheck className="mr-2" />
						{saveMessage}
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{/* Columna izquierda: Configuración */}
					<div className="space-y-4">
						<div>
							<label
								htmlFor="lawyerCommission"
								className="block text-sm font-medium text-gray-700 mb-1">
								Comisión para Abogados (%)
							</label>
							<input
								type="number"
								id="lawyerCommission"
								min="0"
								max="100"
								step="0.01"
								value={lawyerCommission}
								onChange={(e) => setLawyerCommission(parseFloat(e.target.value) || 0)}
								className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
							/>
							<p className="mt-1 text-xs text-gray-500">
								Porcentaje del total de la orden que recibe el abogado
							</p>
						</div>

						<div>
							<label
								htmlFor="operationalCosts"
								className="block text-sm font-medium text-gray-700 mb-1">
								Gastos Operativos (%)
							</label>
							<input
								type="number"
								id="operationalCosts"
								min="0"
								max="100"
								step="0.01"
								value={operationalCosts}
								onChange={(e) => setOperationalCosts(parseFloat(e.target.value) || 0)}
								className="block w-full rounded-md border-gray-300 shadow-sm focus:border-azul-primario focus:ring-azul-primario sm:text-sm"
							/>
							<p className="mt-1 text-xs text-gray-500">
								Porcentaje de los ingresos totales destinado a gastos operativos
							</p>
						</div>

						{/* Validaciones y Advertencias */}
						{validation.errors.length > 0 && (
							<div className="bg-red-50 border border-red-200 rounded-lg p-3">
								<div className="flex">
									<FiAlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" />
									<div>
										<h4 className="text-sm font-medium text-red-800">Errores de validación:</h4>
										<ul className="mt-1 text-sm text-red-700 list-disc list-inside">
											{validation.errors.map((error, idx) => (
												<li key={idx}>{error}</li>
											))}
										</ul>
									</div>
								</div>
							</div>
						)}

						{validation.warnings.length > 0 && validation.isValid && (
							<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
								<div className="flex">
									<FiAlertTriangle className="text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
									<div>
										<h4 className="text-sm font-medium text-yellow-800">Advertencias:</h4>
										<ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
											{validation.warnings.map((warning, idx) => (
												<li key={idx}>{warning}</li>
											))}
										</ul>
									</div>
								</div>
							</div>
						)}

						<button
							onClick={handleSave}
							disabled={!validation.isValid || isSaving}
							className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-azul-primario hover:bg-azul-primario/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-azul-primario disabled:opacity-50 disabled:cursor-not-allowed">
							{isSaving ? (
								<>
									<svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Guardando...
								</>
							) : (
								<>
									<FiSave className="mr-2" />
									Guardar Cambios
								</>
							)}
						</button>
					</div>

					{/* Columna derecha: Preview en tiempo real */}
					<div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-lg p-6 border border-blue-100">
						<div className="flex items-center mb-4">
							<FiTrendingUp className="text-blue-600 text-xl mr-2" />
							<h3 className="text-lg font-semibold text-gray-900">Preview en Tiempo Real</h3>
						</div>
						<p className="text-sm text-gray-600 mb-4">
							Simulación con ingresos actuales: <span className="font-bold">${previewData.totalRevenue?.toLocaleString() || 0}</span>
						</p>

						<div className="space-y-3">
							<div className="bg-white rounded p-3 shadow-sm">
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">Pago a Abogados ({lawyerCommission}%)</span>
									<span className="text-sm font-bold text-blue-600">
										${previewData.lawyerPayments?.toLocaleString() || 0}
									</span>
								</div>
							</div>

							<div className="bg-white rounded p-3 shadow-sm">
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-600">Gastos Operativos ({operationalCosts}%)</span>
									<span className="text-sm font-bold text-orange-600">
										${previewData.operationalCosts?.toLocaleString() || 0}
									</span>
								</div>
							</div>

							<div className="bg-white rounded p-3 shadow-sm border-2 border-green-200">
								<div className="flex justify-between items-center">
									<span className="text-sm font-semibold text-gray-700">Ganancia Neta Plataforma</span>
									<span className="text-lg font-bold text-green-600">
										${previewData.netProfit?.toLocaleString() || 0}
									</span>
								</div>
								<div className="mt-1 text-xs text-gray-500">
									Margen: {previewData.profitMargin?.toFixed(2) || 0}%
								</div>
							</div>
						</div>

						{/* Indicador visual del margen */}
						<div className="mt-4">
							<div className="flex justify-between text-xs text-gray-600 mb-1">
								<span>Distribución</span>
								<span>{100 - (lawyerCommission + operationalCosts)}% para plataforma</span>
							</div>
							<div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
								<div
									style={{ width: `${lawyerCommission}%` }}
									className="bg-blue-500 transition-all duration-300"
									title={`Abogados: ${lawyerCommission}%`}
								></div>
								<div
									style={{ width: `${operationalCosts}%` }}
									className="bg-orange-500 transition-all duration-300"
									title={`Gastos: ${operationalCosts}%`}
								></div>
								<div
									style={{ width: `${100 - (lawyerCommission + operationalCosts)}%` }}
									className="bg-green-500 transition-all duration-300"
									title={`Ganancia: ${100 - (lawyerCommission + operationalCosts)}%`}
								></div>
							</div>
							<div className="flex justify-between text-xs text-gray-500 mt-1">
								<span>Abogados</span>
								<span>Gastos</span>
								<span>Ganancia</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

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


		{/* Configuración Financiera Dinámica */}
		<FinancialSettingsSection />

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
onChange={() => {}}
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
