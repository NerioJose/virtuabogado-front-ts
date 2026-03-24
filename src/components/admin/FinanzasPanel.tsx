'use client';

/**
 * Panel de Finanzas - Conectado a React Query
 * Calcula métricas financieras desde datos reales de la API
 */

import { useMemo, memo, useState } from 'react';
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
import { useOrders, OrderStatus } from '@/features/orders';
import { ElementoSeleccionable } from '@/types';

interface FinanzasPanelProps {
	terminoBusqueda: string;
	abrirModal: (
		tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar',
		elemento?: ElementoSeleccionable
	) => void;
}

function FinanzasPanel({ terminoBusqueda, abrirModal }: FinanzasPanelProps) {
	// ============ REACT QUERY (datos reales de la API) ============
	const { data: orders = [], isLoading } = useOrders();

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

		// Filtrar por período
		const ordersInPeriod = orders.filter(order => {
			if (!order.createdAt) return false;
			const orderDate = new Date(order.createdAt);
			return orderDate >= startDate;
		});

		// Incluir PENDING (PENDIENTE), PROCESSING (EN_PROGRESO) y COMPLETED (COMPLETADO) en ingresos
		const ingresosTotales = ordersInPeriod
			.filter(o =>
				o.status === OrderStatus.PENDING ||
				o.status === OrderStatus.PROCESSING ||
				o.status === OrderStatus.COMPLETED
			)
			.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

		const pagosAbogados = ingresosTotales * 0.25; // 25% comisión abogados (Simulado)
		const gastosOperativos = ingresosTotales * 0.10; // 10% gastos operativos (Simulado)
		const gananciasNetas = ingresosTotales - pagosAbogados - gastosOperativos;

		// Solo órdenes pendientes (sin completar)
		const ingresosPendientes = ordersInPeriod
			.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PROCESSING)
			.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

		return {
			ingresosTotales,
			pagosAbogados,
			gastosOperativos,
			gananciasNetas,
			ingresosPendientes,
			cantidadTransacciones: ordersInPeriod.length,
		};
	}, [orders, periodo]);

	// Filtrar órdenes por búsqueda (sobre el total de órdenes del período para mejor UX)
	const ordenesFiltradas = useMemo(() => {
		// Primero filtramos las que están en el período para la tabla
		const now = new Date();
		const startDate = new Date();
		switch (periodo) {
			case 'hoy': startDate.setHours(0, 0, 0, 0); break;
			case 'semana': startDate.setDate(now.getDate() - 7); break;
			case 'mes': startDate.setMonth(now.getMonth() - 1); break;
			case 'año': startDate.setFullYear(now.getFullYear() - 1); break;
		}

		const periordOrders = orders.filter(o => new Date(o.createdAt) >= startDate);

		if (!terminoBusqueda) return periordOrders;

		return periordOrders.filter(order =>
			order.userName?.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
			order.userEmail?.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
			(order.numericId?.toString() || order.id.toString()).includes(terminoBusqueda)
		);
	}, [orders, terminoBusqueda, periodo]);

	return (
		<div className="space-y-6">
			{/* Resumen Financiero */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{isLoading ? (
					<>
						{[1, 2, 3, 4].map(i => (
							<div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
								<div className="flex items-center justify-between">
									<div>
										<div className="h-4 bg-gray-200 rounded w-28 mb-3"></div>
										<div className="h-8 bg-gray-200 rounded w-20"></div>
									</div>
									<div className="w-10 h-10 rounded-full bg-gray-200"></div>
								</div>
							</div>
						))}
					</>
				) : (
					<>
						{/* Ingresos Totales */}
						<div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-500">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ingresos Totales</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">
										${resumenFinanciero.ingresosTotales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
									</p>
								</div>
								<div className="p-3 bg-green-50 rounded-lg">
									<FiDollarSign className="text-green-600 text-xl" />
								</div>
							</div>
						</div>

						{/* Pagos a Abogados */}
						<div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pagos a Abogados</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">
										${resumenFinanciero.pagosAbogados.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
									</p>
								</div>
								<div className="p-3 bg-blue-50 rounded-lg">
									<FiCreditCard className="text-blue-600 text-xl" />
								</div>
							</div>
						</div>

						{/* Gastos Operativos */}
						<div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Gastos Operativos</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">
										${resumenFinanciero.gastosOperativos.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
									</p>
								</div>
								<div className="p-3 bg-red-50 rounded-lg">
									<FiTrendingDown className="text-red-600 text-xl" />
								</div>
							</div>
						</div>

						{/* Ganancias Netas */}
						<div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-indigo-500">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ganancias Netas</p>
									<p className={`text-2xl font-bold mt-1 ${resumenFinanciero.gananciasNetas >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
										${resumenFinanciero.gananciasNetas.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
									</p>
								</div>
								<div className={`p-3 rounded-lg ${resumenFinanciero.gananciasNetas >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
									<FiTrendingUp className={resumenFinanciero.gananciasNetas >= 0 ? 'text-indigo-600' : 'text-red-600'} />
								</div>
							</div>
						</div>
					</>
				)}
			</div>

			{/* Filtros de Período */}
			<div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center space-x-4">
						<div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
							<FiFilter className="text-gray-400 mr-2" />
							<span className="text-gray-700 font-medium text-sm">Período:</span>
						</div>

						<div className="flex p-1 bg-gray-100 rounded-lg">
							{(['hoy', 'semana', 'mes', 'año'] as const).map((p) => (
								<button
									key={p}
									onClick={() => setPeriodo(p)}
									className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${periodo === p
										? 'bg-white text-azul-primario shadow-sm'
										: 'text-gray-500 hover:text-gray-700'
										}`}
								>
									{p === 'hoy' ? 'Hoy' :
										p === 'semana' ? 'Semana' :
											p === 'mes' ? 'Mes' : 'Año'}
								</button>
							))}
						</div>
					</div>

					<button
						onClick={() => window.print()}
						className="flex items-center gap-2 px-6 py-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-all font-medium shadow-md hover:shadow-lg active:scale-95"
					>
						<FiDownload />
						Exportar PDF
					</button>
				</div>
			</div>

			{/* Transacciones / Órdenes */}
			<div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
				<div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
					<h3 className="text-lg font-bold text-azul-primario">
						Transacciones del Período
					</h3>
					<span className="px-3 py-1 bg-azul-primario/10 text-azul-primario rounded-full text-xs font-bold uppercase">
						{resumenFinanciero.cantidadTransacciones} Operaciones
					</span>
				</div>

				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead>
							<tr className="bg-gray-50">
								<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
								<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
								<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Servicio</th>
								<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
								<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Monto</th>
								<th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
								<th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{isLoading ? (
								<tr>
									<td colSpan={7} className="px-6 py-12 text-center">
										<div className="flex flex-col items-center justify-center gap-3 text-gray-400">
											<div className="w-10 h-10 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
											<p className="font-medium">Cargando datos financieros...</p>
										</div>
									</td>
								</tr>
							) : ordenesFiltradas.length === 0 ? (
								<tr>
									<td colSpan={7} className="px-6 py-12 text-center">
										<div className="flex flex-col items-center justify-center text-gray-400">
											<FiPieChart size={48} className="mb-4 opacity-20" />
											<p className="text-lg font-medium text-gray-500">No hay transacciones registradas</p>
											<p className="text-sm mt-1">No se encontraron movimientos para el período seleccionado</p>
										</div>
									</td>
								</tr>
							) : (
								ordenesFiltradas.map((order) => (
									<tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
										<td className="px-6 py-4 whitespace-nowrap">
											<span className="text-sm font-bold text-azul-primario">
												#{order.numericId || order.id.slice(0, 8)}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-bold text-gray-900">{order.userName || 'Usuario'}</div>
											<div className="text-xs text-gray-500">{order.userEmail}</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-700">
												{order.items?.[0]?.serviceName || 'Consulta Legal'}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
											{new Date(order.createdAt).toLocaleDateString('es-ES', {
												day: '2-digit',
												month: 'short',
												year: 'numeric'
											})}
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-bold text-gray-900">
												${order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${order.status === OrderStatus.COMPLETED
												? 'bg-green-100 text-green-700'
												: order.status === OrderStatus.PROCESSING
													? 'bg-blue-100 text-blue-700'
													: 'bg-yellow-100 text-yellow-700'
												}`}>
												{order.status === OrderStatus.COMPLETED
													? 'Completado'
													: order.status === OrderStatus.PROCESSING
														? 'En proceso'
														: 'Pendiente'}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right">
											<div className="flex justify-end gap-2">
												<button
													onClick={() => abrirModal('ver', order as unknown as ElementoSeleccionable)}
													className="p-2 text-gray-400 hover:text-azul-primario transition-colors"
													title="Ver detalles"
												>
													<FiEye size={18} />
												</button>
												<button
													onClick={() => abrirModal('editar', order as unknown as ElementoSeleccionable)}
													className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
													title="Editar estado"
												>
													<FiDollarSign size={18} />
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

			{/* Ingresos Pendientes (Notificación) */}
			{!isLoading && resumenFinanciero.ingresosPendientes > 0 && (
				<div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 shadow-sm">
					<div className="flex items-center">
						<div className="p-3 bg-amber-100 rounded-lg mr-4">
							<FiPieChart className="text-amber-600 text-xl" />
						</div>
						<div>
							<p className="text-sm font-bold text-amber-900">
								Atención: Ingresos Pendientes
							</p>
							<p className="text-sm text-amber-700 mt-1">
								Tienes <span className="font-bold">${resumenFinanciero.ingresosPendientes.toLocaleString()}</span> en transacciones que aún no han sido completadas.
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default memo(FinanzasPanel);
