/**
 * Panel de Finanzas - Conectado a ordersStore
 * Calcula métricas financieras desde datos reales
 */

import { useMemo, memo } from 'react';
import {
	FiDollarSign,
	FiTrendingUp,
	FiTrendingDown,
	FiFilter,
	FiDownload,
	FiCreditCard,
	FiEye,
	FiPieChart,
} from 'react-icons/fi';
import { useOrdersStore, OrderStatus } from '@/features/orders';
import { useState } from 'react';
import { ElementoSeleccionable } from '@/types'; // Assuming ElementoSeleccionable is defined here or similar

interface FinanzasPanelProps {
	terminoBusqueda: string;
	abrirModal: (
		tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar',
		elemento?: ElementoSeleccionable
	) => void;
}

function FinanzasPanel({ terminoBusqueda }: FinanzasPanelProps) {
	// ============ ZUSTAND STORE ============
	const orders = useOrdersStore((state) => state.orders);

	const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'año'>('mes');

	// Calcular resumen financiero desde órdenes reales
	const resumenFinanciero = useMemo(() => {
		const now = new Date();
		const startDate = new Date();

		switch (periodo) {
			case 'hoy':
				startDate.setHours(0, 0, 0, 0);
				break;
			case 'semana':
				startDate.setDate(now.getDate() - 7);
				break;
			case 'mes':
				startDate.setMonth(now.getMonth() - 1);
				break;
			case 'año':
				startDate.setFullYear(now.getFullYear() - 1);
				break;
		}

		const ordersInPeriod = orders.filter(
			order => new Date(order.createdAt) >= startDate
		);

		// Incluir PENDING, PROCESSING y COMPLETED en ingresos
		// (las órdenes del checkout empiezan en PENDING)
		const ingresosTotales = ordersInPeriod
			.filter(o =>
				o.status === OrderStatus.PENDING ||
				o.status === OrderStatus.PROCESSING ||
				o.status === OrderStatus.COMPLETED
			)
			.reduce((sum, o) => sum + o.total, 0);

		const pagosAbogados = ingresosTotales * 0.25; // 25% comisión abogados
		const gastosOperativos = 0; // TODO: Conectar a un store de gastos
		const gananciasNetas = ingresosTotales - pagosAbogados - gastosOperativos;

		// Solo órdenes pendientes (sin completar)
		const ingresosPendientes = ordersInPeriod
			.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PROCESSING)
			.reduce((sum, o) => sum + o.total, 0);

		return {
			ingresosTotales,
			pagosAbogados,
			gastosOperativos,
			gananciasNetas,
			ingresosPendientes,
			cantidadTransacciones: ordersInPeriod.length,
		};
	}, [orders, periodo]);

	// Filtrar órdenes por búsqueda
	const ordenesFiltradas = useMemo(() => {
		if (!terminoBusqueda) return orders;

		return orders.filter(order =>
			order.userName.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
			order.userEmail.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
			order.id.toString().includes(terminoBusqueda)
		);
	}, [orders, terminoBusqueda]);

	return (
		<div className="space-y-6">
			{/* Resumen Financiero */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{/* Ingresos Totales */}
				<div className="bg-white rounded-lg shadow-sm p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Ingresos Totales</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								${resumenFinanciero.ingresosTotales.toLocaleString()}
							</p>
						</div>
						<div className="p-3 bg-green-100 rounded-full">
							<FiDollarSign className="text-green-600 text-xl" />
						</div>
					</div>
				</div>

				{/* Pagos a Abogados */}
				<div className="bg-white rounded-lg shadow-sm p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Pagos a Abogados</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								${resumenFinanciero.pagosAbogados.toLocaleString()}
							</p>
						</div>
						<div className="p-3 bg-blue-100 rounded-full">
							<FiCreditCard className="text-blue-600 text-xl" />
						</div>
					</div>
				</div>

				{/* Gastos Operativos */}
				<div className="bg-white rounded-lg shadow-sm p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Gastos Operativos</p>
							<p className="text-2xl font-bold text-gray-900 mt-1">
								${resumenFinanciero.gastosOperativos.toLocaleString()}
							</p>
						</div>
						<div className="p-3 bg-red-100 rounded-full">
							<FiTrendingDown className="text-red-600 text-xl" />
						</div>
					</div>
				</div>

				{/* Ganancias Netas */}
				<div className="bg-white rounded-lg shadow-sm p-6">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-600">Ganancias Netas</p>
							<p className={`text-2xl font-bold mt-1 ${resumenFinanciero.gananciasNetas >= 0 ? 'text-green-600' : 'text-red-600'
								}`}>
								${resumenFinanciero.gananciasNetas.toLocaleString()}
							</p>
						</div>
						<div className={`p-3 rounded-full ${resumenFinanciero.gananciasNetas >= 0 ? 'bg-green-100' : 'bg-red-100'
							}`}>
							<FiTrendingUp className={
								resumenFinanciero.gananciasNetas >= 0 ? 'text-green-600' : 'text-red-600'
							} />
						</div>
					</div>
				</div>
			</div>

			{/* Filtros de Período */}
			<div className="bg-white rounded-lg shadow-sm p-4">
				<div className="flex flex-wrap items-center gap-4">
					<div className="flex items-center">
						<FiFilter className="text-gray-500 mr-2" />
						<span className="text-gray-700 font-medium">Período:</span>
					</div>

					<div className="flex flex-wrap gap-2">
						{(['hoy', 'semana', 'mes', 'año'] as const).map((p) => (
							<button
								key={p}
								onClick={() => setPeriodo(p)}
								className={`px-3 py-1 rounded-full text-sm ${periodo === p
									? 'bg-azul-primario text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
									}`}
							>
								{p === 'hoy' ? 'Hoy' :
									p === 'semana' ? 'Última semana' :
										p === 'mes' ? 'Último mes' : 'Último año'}
							</button>
						))}
					</div>

					<button
						className="ml-auto flex items-center gap-2 px-4 py-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90"
					>
						<FiDownload />
						Exportar
					</button>
				</div>
			</div>

			{/* Transacciones / Órdenes */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="p-4 border-b border-gray-200">
					<h3 className="text-lg font-medium text-gray-900">
						Transacciones Recientes ({resumenFinanciero.cantidadTransacciones})
					</h3>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									ID
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Cliente
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Servicio
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Fecha
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Monto
								</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
									Estado
								</th>
								<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{ordenesFiltradas.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-6 py-4 text-center text-gray-500">
										{orders.length === 0
											? 'No hay transacciones registradas'
											: 'No se encontraron transacciones'}
									</td>
								</tr>
							) : (
								ordenesFiltradas.map((order) => (
									<tr key={order.id} className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="text-sm font-medium text-azul-primario">
												#{order.id}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{order.userName}
											</div>
											<div className="text-sm text-gray-500">{order.userEmail}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{order.items[0]?.serviceName || 'N/A'}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{new Date(order.createdAt).toLocaleDateString('es-ES')}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												${order.total.toLocaleString()}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.status === OrderStatus.COMPLETED
												? 'bg-green-100 text-green-800'
												: order.status === OrderStatus.PROCESSING
													? 'bg-blue-100 text-blue-800'
													: 'bg-yellow-100 text-yellow-800'
												}`}>
												{order.status === OrderStatus.COMPLETED
													? 'Completado'
													: order.status === OrderStatus.PROCESSING
														? 'En proceso'
														: 'Pendiente'}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<button
												className="text-azul-primario hover:text-azul-primario/80"
												title="Ver detalles"
											>
												<FiEye />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Ingresos Pendientes */}
			{resumenFinanciero.ingresosPendientes > 0 && (
				<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
					<div className="flex items-center">
						<FiPieChart className="text-amber-600 text-xl mr-3" />
						<div>
							<p className="text-sm font-medium text-amber-800">
								Transacciones pendientes
							</p>
							<p className="text-xs text-amber-600 mt-1">
								Tienes ${resumenFinanciero.ingresosPendientes.toLocaleString()} en ingresos pendientes de completar
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default memo(FinanzasPanel);
