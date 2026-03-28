'use client';

import { useMemo, useState, memo } from 'react';
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
import { useOrders } from '@/features/orders';
import { ElementoSeleccionable } from '@/types';
import { formatUSD } from '@/lib/finance';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQuery } from '@tanstack/react-query';

interface FinanzasPanelProps {
	terminoBusqueda: string;
	abrirModal: (
		tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar',
		elemento?: ElementoSeleccionable
	) => void;
}

function FinanzasPanel({ terminoBusqueda, abrirModal }: FinanzasPanelProps) {
	const user = useAuthStore(state => state.user);
	const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes' | 'año' | 'all'>('mes');

	// ============ REACT QUERY (Datos Financieros Reales con Precision) ============
	const { data: summary, isLoading: isLoadingSummary } = useQuery({
		queryKey: ['Finance', periodo, user?.id],
		queryFn: () => getFinancialSummary({ dateRange: periodo as any }, { id: user!.id, rol: user!.rol as any }),
		enabled: !!user
	});

	// Para la tabla seguimos usando las órdenes generales
	const { data: response, isLoading: isLoadingOrders } = useOrders({ limit: 500 });
	const orders = response?.data || [];

	// Filtrar órdenes por búsqueda
	const ordenesFiltradas = useMemo(() => {
		if (!terminoBusqueda) return orders;

		return orders.filter(order =>
			order.userName?.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
			order.userEmail?.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
			(order.numericId?.toString() || order.id.toString()).includes(terminoBusqueda)
		);
	}, [orders, terminoBusqueda]);

	const isLoading = isLoadingSummary || isLoadingOrders;

	return (
		<div className="space-y-6">
			{/* Resumen Financiero con KPIs Reales */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{isLoading ? (
					<>
						{[1, 2, 3, 4].map(i => (
							<div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
								<div className="flex items-center justify-between">
									<div className="space-y-2">
										<div className="h-4 bg-gray-200 rounded w-28"></div>
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
										{formatUSD(summary?.totalIncome)}
									</p>
								</div>
								<div className="p-3 bg-green-50 rounded-lg">
									<FiDollarSign className="text-green-600 text-xl" />
								</div>
							</div>
						</div>

						{/* Pagos a Abogados (Liability) */}
						<div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pagos a Abogados</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">
										{formatUSD(summary?.pendingLawyerPayments)}
									</p>
								</div>
								<div className="p-3 bg-blue-50 rounded-lg">
									<FiCreditCard className="text-blue-600 text-xl" />
								</div>
							</div>
						</div>

						{/* Gastos Operativos + Impuestos */}
						<div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-500">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Gastos y Tax</p>
									<p className="text-2xl font-bold text-gray-900 mt-1">
										{formatUSD(summary?.operationalCostsAndTaxes)}
									</p>
								</div>
								<div className="p-3 bg-red-50 rounded-lg">
									<FiTrendingDown className="text-red-600 text-xl" />
								</div>
							</div>
						</div>

						{/* Ganancias Netas Reales (Post-Split) */}
						<div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-indigo-500">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Ganancia Real</p>
									<p className={`text-2xl font-bold mt-1 ${(summary?.realProfit || 0) >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
										{formatUSD(summary?.realProfit)}
									</p>
								</div>
								<div className={`p-3 rounded-lg ${(summary?.realProfit || 0) >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
									<FiTrendingUp className={(summary?.realProfit || 0) >= 0 ? 'text-indigo-600' : 'text-red-600'} />
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

						<div className="flex p-1 bg-gray-100 rounded-lg border border-gray-200">
							{(['hoy', 'semana', 'mes', 'año'] as const).map((p) => (
								<button
									key={p}
									onClick={() => setPeriodo(p)}
									className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${periodo === p
										? 'bg-white text-azul-primario shadow-sm'
										: 'text-gray-500 hover:text-gray-700'
										}`}
								>
									{p.charAt(0).toUpperCase() + p.slice(1)}
								</button>
							))}
						</div>
					</div>

					<button
						onClick={() => window.print()}
						className="flex items-center gap-2 px-6 py-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-all font-bold shadow-md hover:shadow-lg active:scale-95"
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
						{summary?.transactionCount || 0} Operaciones
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
												{formatUSD(order.total)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${order.status === 'COMPLETADO'
												? 'bg-green-100 text-green-700'
												: order.status === 'EN_PROGRESO'
													? 'bg-blue-100 text-blue-700'
													: 'bg-yellow-100 text-yellow-700'
												}`}>
												{order.status === 'COMPLETADO'
													? 'Completado'
													: order.status === 'EN_PROGRESO'
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
		</div>
	);
}

export default memo(FinanzasPanel);
