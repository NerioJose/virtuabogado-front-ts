import { useState, useEffect } from 'react';
import {
	FiDollarSign,
	FiTrendingUp,
	FiFilter,
	FiDownload,
	FiCalendar,
	FiCreditCard,
	FiUser,
	FiEye,
	FiEdit,
	FiTrash2,
	FiCheck,
	FiX,
	FiPieChart,
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { ElementoSeleccionable } from '@/types/index';

interface FinanzasPanelProps {
	terminoBusqueda: string;
	abrirModal: (
		tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar',
		elemento?: ElementoSeleccionable
	) => void;
}

interface Transaccion {
	id: number;
	concepto: string;
	monto: number;
	fecha: string;
	tipo: 'ingreso' | 'gasto' | 'pago_abogado';
	estado: 'completado' | 'pendiente' | 'cancelado';
	cliente?: string;
	abogado?: string;
	caso?: string;
	metodoPago?: string;
}

export default function FinanzasPanel({
	terminoBusqueda,
	abrirModal,
}: FinanzasPanelProps) {
	const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
	const [loading, setLoading] = useState(true);
	const [filtroTipo, setFiltroTipo] = useState<
		'todos' | 'ingreso' | 'gasto' | 'pago_abogado'
	>('todos');
	const [filtroFecha, setFiltroFecha] = useState<
		'todos' | 'hoy' | 'semana' | 'mes'
	>('mes');
	const [filtroEstado, setFiltroEstado] = useState<
		'todos' | 'completado' | 'pendiente' | 'cancelado'
	>('todos');

	const [resumenFinanciero, setResumenFinanciero] = useState({
		ingresosMes: 0,
		gastosMes: 0,
		pagosAbogadosMes: 0,
		balanceMes: 0,
		ingresosPendientes: 0,
	});

	useEffect(() => {
		// Aquí se haría la llamada a la API para obtener las transacciones
		// Por ahora usamos datos de ejemplo
		setTimeout(() => {
			const transaccionesEjemplo: Transaccion[] = [
				{
					id: 1,
					concepto: 'Consulta legal virtual',
					monto: 99.99,
					fecha: '2023-06-15',
					tipo: 'ingreso',
					estado: 'completado',
					cliente: 'María González',
					caso: 'Consulta sobre contrato laboral',
					metodoPago: 'Tarjeta de crédito',
				},
				{
					id: 2,
					concepto: 'Asesoría en divorcio',
					monto: 199.99,
					fecha: '2023-06-14',
					tipo: 'ingreso',
					estado: 'completado',
					cliente: 'Juan Pérez',
					caso: 'Asesoría en divorcio',
					metodoPago: 'PayPal',
				},
				{
					id: 3,
					concepto: 'Pago a abogado - Carlos Rodríguez',
					monto: 75.0,
					fecha: '2023-06-13',
					tipo: 'pago_abogado',
					estado: 'completado',
					abogado: 'Carlos Rodríguez',
					caso: 'Consulta sobre contrato laboral',
				},
				{
					id: 4,
					concepto: 'Licencia software legal',
					monto: 49.99,
					fecha: '2023-06-10',
					tipo: 'gasto',
					estado: 'completado',
					metodoPago: 'Tarjeta corporativa',
				},
				{
					id: 5,
					concepto: 'Revisión de contrato',
					monto: 149.99,
					fecha: '2023-06-09',
					tipo: 'ingreso',
					estado: 'pendiente',
					cliente: 'Luis Sánchez',
					caso: 'Revisión de contrato de arrendamiento',
				},
				{
					id: 6,
					concepto: 'Pago a abogado - Ana Martínez',
					monto: 120.0,
					fecha: '2023-06-08',
					tipo: 'pago_abogado',
					estado: 'pendiente',
					abogado: 'Ana Martínez',
					caso: 'Asesoría en divorcio',
				},
				{
					id: 7,
					concepto: 'Servicio de hosting',
					monto: 29.99,
					fecha: '2023-06-05',
					tipo: 'gasto',
					estado: 'completado',
					metodoPago: 'Transferencia bancaria',
				},
				{
					id: 8,
					concepto: 'Asesoría fiscal',
					monto: 129.99,
					fecha: '2023-06-03',
					tipo: 'ingreso',
					estado: 'cancelado',
					cliente: 'Pablo Moreno',
					caso: 'Asesoría fiscal para autónomos',
				},
			];

			setTransacciones(transaccionesEjemplo);

			// Calcular resumen financiero
			const ingresosMes = transaccionesEjemplo
				.filter((t) => t.tipo === 'ingreso' && t.estado === 'completado')
				.reduce((sum, t) => sum + t.monto, 0);

			const gastosMes = transaccionesEjemplo
				.filter((t) => t.tipo === 'gasto' && t.estado === 'completado')
				.reduce((sum, t) => sum + t.monto, 0);

			const pagosAbogadosMes = transaccionesEjemplo
				.filter((t) => t.tipo === 'pago_abogado' && t.estado === 'completado')
				.reduce((sum, t) => sum + t.monto, 0);

			const ingresosPendientes = transaccionesEjemplo
				.filter((t) => t.tipo === 'ingreso' && t.estado === 'pendiente')
				.reduce((sum, t) => sum + t.monto, 0);

			setResumenFinanciero({
				ingresosMes,
				gastosMes,
				pagosAbogadosMes,
				balanceMes: ingresosMes - gastosMes - pagosAbogadosMes,
				ingresosPendientes,
			});

			setLoading(false);
		}, 1000);
	}, []);

	// Filtrar transacciones según término de búsqueda y filtros
	const transaccionesFiltradas = transacciones.filter((transaccion) => {
		const coincideTermino =
			transaccion.concepto
				.toLowerCase()
				.includes(terminoBusqueda.toLowerCase()) ||
			(transaccion.cliente &&
				transaccion.cliente
					.toLowerCase()
					.includes(terminoBusqueda.toLowerCase())) ||
			(transaccion.abogado &&
				transaccion.abogado
					.toLowerCase()
					.includes(terminoBusqueda.toLowerCase())) ||
			(transaccion.caso &&
				transaccion.caso.toLowerCase().includes(terminoBusqueda.toLowerCase()));

		const coincideTipo =
			filtroTipo === 'todos' || transaccion.tipo === filtroTipo;
		const coincideEstado =
			filtroEstado === 'todos' || transaccion.estado === filtroEstado;

		// Filtro por fecha
		const fechaTransaccion = new Date(transaccion.fecha);
		const hoy = new Date();
		const unaSemanaAtras = new Date();
		unaSemanaAtras.setDate(hoy.getDate() - 7);
		const unMesAtras = new Date();
		unMesAtras.setMonth(hoy.getMonth() - 1);

		let coincideFecha = true;
		if (filtroFecha === 'hoy') {
			coincideFecha = fechaTransaccion.toDateString() === hoy.toDateString();
		} else if (filtroFecha === 'semana') {
			coincideFecha = fechaTransaccion >= unaSemanaAtras;
		} else if (filtroFecha === 'mes') {
			coincideFecha = fechaTransaccion >= unMesAtras;
		}

		return coincideTermino && coincideTipo && coincideFecha && coincideEstado;
	});

	// Función para cambiar el estado de una transacción
	const cambiarEstadoTransaccion = (
		id: number,
		nuevoEstado: 'completado' | 'pendiente' | 'cancelado'
	) => {
		setTransacciones(
			transacciones.map((transaccion) =>
				transaccion.id === id
					? { ...transaccion, estado: nuevoEstado }
					: transaccion
			)
		);
	};

	// Función para obtener el color según el tipo de transacción
	const obtenerColorTipo = (tipo: Transaccion['tipo']) => {
		switch (tipo) {
			case 'ingreso':
				return 'bg-green-100 text-green-800';
			case 'gasto':
				return 'bg-red-100 text-red-800';
			case 'pago_abogado':
				return 'bg-blue-100 text-blue-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// Función para obtener el color según el estado de la transacción
	const obtenerColorEstado = (estado: Transaccion['estado']) => {
		switch (estado) {
			case 'completado':
				return 'bg-green-100 text-green-800';
			case 'pendiente':
				return 'bg-yellow-100 text-yellow-800';
			case 'cancelado':
				return 'bg-gray-100 text-gray-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// Función para exportar a Excel (simulada)
	const exportarExcel = () => {
		alert('Exportando datos a Excel...');
		// Aquí iría la lógica real para exportar a Excel
	};

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Resumen financiero */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.1 }}
					className="bg-white rounded-xl shadow-md p-6">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-gray-500 text-sm">Ingresos del mes</p>
							<h3 className="text-3xl font-bold text-azul-primario mt-2">
								{resumenFinanciero.ingresosMes.toLocaleString('es-ES', {
									style: 'currency',
									currency: 'EUR',
								})}
							</h3>
						</div>
						<div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
							<FiDollarSign size={24} />
						</div>
					</div>
					<div className="mt-4 flex items-center text-green-500 text-sm">
						<FiTrendingUp className="mr-1" />
						<span>+8.2% vs mes anterior</span>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0 }}
					className="bg-white rounded-xl shadow-md p-6">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-gray-500 text-sm">Gastos del mes</p>
							<h3 className="text-3xl font-bold text-azul-primario mt-2">
								{resumenFinanciero.gastosMes.toLocaleString('es-ES', {
									style: 'currency',
									currency: 'EUR',
								})}
							</h3>
						</div>
						<div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
							<FiDollarSign size={24} />
						</div>
					</div>
					<div className="mt-4 flex items-center text-red-500 text-sm">
						<FiTrendingUp className="mr-1" />
						<span>+3.5% vs mes anterior</span>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.3 }}
					className="bg-white rounded-xl shadow-md p-6">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-gray-500 text-sm">Pagos a abogados</p>
							<h3 className="text-3xl font-bold text-azul-primario mt-2">
								{resumenFinanciero.pagosAbogadosMes.toLocaleString('es-ES', {
									style: 'currency',
									currency: 'EUR',
								})}
							</h3>
						</div>
						<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
							<FiUser size={24} />
						</div>
					</div>
					<div className="mt-4 flex items-center text-blue-500 text-sm">
						<FiTrendingUp className="mr-1" />
						<span>+12.3% vs mes anterior</span>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.4 }}
					className="bg-white rounded-xl shadow-md p-6">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-gray-500 text-sm">Balance neto</p>
							<h3 className="text-3xl font-bold text-azul-primario mt-2">
								{resumenFinanciero.balanceMes.toLocaleString('es-ES', {
									style: 'currency',
									currency: 'EUR',
								})}
							</h3>
						</div>
						<div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
							<FiPieChart size={24} />
						</div>
					</div>
					<div className="mt-4 flex items-center text-purple-500 text-sm">
						<FiTrendingUp className="mr-1" />
						<span>+5.7% vs mes anterior</span>
					</div>
				</motion.div>
			</div>

			{/* Filtros y acciones */}
			<div className="bg-white rounded-lg shadow-sm p-4">
				<div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
					<div className="flex flex-wrap items-center gap-4">
						{/* Filtro por tipo */}
						<div className="flex items-center">
							<FiFilter className="text-gray-500 mr-2" />
							<span className="text-gray-700 font-medium mr-2">Tipo:</span>
							<select
								title="Filtrar por tipo de transacción"
								value={filtroTipo}
								onChange={(e) =>
									setFiltroTipo(
										e.target.value as
											| 'todos'
											| 'ingreso'
											| 'gasto'
											| 'pago_abogado'
									)
								}
								className="border border-gray-300 rounded-md px-2 py-1 text-sm">
								<option value="todos">Todos</option>
								<option value="ingreso">Ingresos</option>
								<option value="gasto">Gastos</option>
								<option value="pago_abogado">Pagos a abogados</option>
							</select>
						</div>

						{/* Filtro por fecha */}
						<div className="flex items-center">
							<FiCalendar className="text-gray-500 mr-2" />
							<span className="text-gray-700 font-medium mr-2">Período:</span>
							<select
								title="Filtrar por período de tiempo"
								value={filtroFecha}
								onChange={(e) =>
									setFiltroFecha(
										e.target.value as 'todos' | 'hoy' | 'semana' | 'mes'
									)
								}
								className="border border-gray-300 rounded-md px-2 py-1 text-sm">
								<option value="todos">Todo</option>
								<option value="hoy">Hoy</option>
								<option value="semana">Última semana</option>
								<option value="mes">Último mes</option>
							</select>
						</div>

						{/* Filtro por estado */}
						<div className="flex items-center">
							<FiCheck className="text-gray-500 mr-2" />
							<span className="text-gray-700 font-medium mr-2">Estado:</span>
							<select
								title="Filtrar por estado de transacción"
								value={filtroEstado}
								onChange={(e) =>
									setFiltroEstado(
										e.target.value as
											| 'todos'
											| 'completado'
											| 'pendiente'
											| 'cancelado'
									)
								}
								className="border border-gray-300 rounded-md px-2 py-1 text-sm">
								<option value="todos">Todos</option>
								<option value="completado">Completados</option>
								<option value="pendiente">Pendientes</option>
								<option value="cancelado">Cancelados</option>
							</select>
						</div>
					</div>

					<div className="flex space-x-2">
						<button
							onClick={() => abrirModal('crear')}
							className="flex items-center space-x-1 bg-azul-primario text-white px-3 py-2 rounded-lg hover:bg-azul-primario/90 transition-colors text-sm">
							<FiDollarSign />
							<span>Registrar transacción</span>
						</button>
						title=&quot;Registrar nueva transacción&quot;
						<button
							onClick={exportarExcel}
							className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm">
							<FiDownload />
							<span>Exportar</span>
						</button>
					</div>
				</div>
			</div>

			{/* Tabla de transacciones */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Concepto
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Fecha
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Tipo
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Estado
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Relacionado con
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Método de pago
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Monto
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{transaccionesFiltradas.length === 0 ? (
								<tr>
									<td
										colSpan={8}
										className="px-6 py-4 text-center text-gray-500">
										No se encontraron transacciones con los criterios de
										búsqueda.
									</td>
								</tr>
							) : (
								transaccionesFiltradas.map((transaccion) => (
									<tr
										key={transaccion.id}
										className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{transaccion.concepto}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{new Date(transaccion.fecha).toLocaleDateString(
													'es-ES'
												)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${obtenerColorTipo(
													transaccion.tipo
												)}`}>
												{transaccion.tipo === 'ingreso'
													? 'Ingreso'
													: transaccion.tipo === 'gasto'
													? 'Gasto'
													: 'Pago a abogado'}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${obtenerColorEstado(
													transaccion.estado
												)}`}>
												{transaccion.estado === 'completado'
													? 'Completado'
													: transaccion.estado === 'pendiente'
													? 'Pendiente'
													: 'Cancelado'}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{transaccion.cliente && (
													<div className="flex items-center">
														<FiUser
															className="text-gray-400 mr-1"
															size={14}
														/>
														<span>{transaccion.cliente}</span>
													</div>
												)}
												{transaccion.abogado && (
													<div className="flex items-center">
														<FiUser
															className="text-gray-400 mr-1"
															size={14}
														/>
														<span>{transaccion.abogado}</span>
													</div>
												)}
												{transaccion.caso && (
													<div className="text-xs text-gray-500 mt-1">
														Caso: {transaccion.caso}
													</div>
												)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{transaccion.metodoPago ? (
													<div className="flex items-center">
														<FiCreditCard
															className="text-gray-400 mr-1"
															size={14}
														/>
														<span>{transaccion.metodoPago}</span>
													</div>
												) : (
													<span className="text-gray-400">-</span>
												)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<div
												className={`text-sm font-medium ${
													transaccion.tipo === 'ingreso'
														? 'text-green-600'
														: 'text-red-600'
												}`}>
												{transaccion.tipo === 'ingreso' ? '+' : '-'}
												{transaccion.monto.toLocaleString('es-ES', {
													style: 'currency',
													currency: 'EUR',
												})}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											<div className="flex justify-end space-x-2">
												<button
													onClick={() => abrirModal('ver', transaccion)}
													className="text-azul-primario hover:text-azul-primario/80"
													title="Ver detalles">
													<FiEye />
												</button>
												<button
													onClick={() => abrirModal('editar', transaccion)}
													className="text-amber-500 hover:text-amber-600"
													title="Editar">
													<FiEdit />
												</button>
												{transaccion.estado === 'pendiente' && (
													<button
														onClick={() =>
															cambiarEstadoTransaccion(
																transaccion.id,
																'completado'
															)
														}
														className="text-green-500 hover:text-green-600"
														title="Marcar como completado">
														<FiCheck />
													</button>
												)}
												{transaccion.estado === 'pendiente' && (
													<button
														onClick={() =>
															cambiarEstadoTransaccion(
																transaccion.id,
																'cancelado'
															)
														}
														className="text-red-500 hover:text-red-600"
														title="Cancelar">
														<FiX />
													</button>
												)}
												<button
													onClick={() => abrirModal('eliminar', transaccion)}
													className="text-red-500 hover:text-red-600"
													title="Eliminar">
													<FiTrash2 />
												</button>
											</div>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Resumen de transacciones pendientes */}
			{transacciones.filter((t) => t.estado === 'pendiente').length > 0 && (
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
					<h3 className="text-lg font-medium text-yellow-800 mb-2">
						Transacciones pendientes
					</h3>
					<p className="text-sm text-yellow-700">
						Tienes{' '}
						{transacciones.filter((t) => t.estado === 'pendiente').length}{' '}
						transacciones pendientes por un valor total de{' '}
						{transacciones
							.filter((t) => t.estado === 'pendiente')
							.reduce((sum, t) => sum + t.monto, 0)
							.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
						.
					</p>
				</div>
			)}
		</div>
	);
}
