import { useState, useEffect, useMemo } from 'react';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';
import {
	FiDollarSign,
	//FiFileText,
	FiDownload,
	FiFilter,
	FiChevronDown,
	FiClock,
	FiPieChart,
	FiTrendingUp,
	FiEye,
	FiCheck,
	FiPlus,
} from 'react-icons/fi';
/*import { FiDollarSign, FiDownload, FiFilter, FiCalendar, FiPieChart, FiTrendingUp, FiClock } from 'react-icons/fi';*/

import { OrderStatus } from '@/features/orders/types/orders.types';

interface FacturacionPanelProps {
	abogadoId: string;
}

interface Factura {
	id: string;
	numero: string;
	cliente: string;
	concepto: string;
	fecha: string;
	importe: number;
	estado: 'pagada' | 'pendiente' | 'vencida';
}

// Tipo para el periodo de facturación
type PeriodoFacturacion = 'mes' | 'trimestre' | 'año';

export default function FacturacionPanel({ abogadoId }: FacturacionPanelProps) {
	// Use real orders as invoices
	const { data: orders = [], isLoading } = useOrdersByLawyer(abogadoId);

	// Derive invoices from completed orders
	const facturas: Factura[] = useMemo(() => {
		return orders
			.filter(o => o.status === OrderStatus.COMPLETED)
			.map(o => ({
				id: o.id.toString(),
				numero: `F-${o.id.toString().slice(0, 8)}`,
				cliente: o.userName || o.userEmail || 'Cliente',
				concepto: o.items?.[0]?.serviceName || 'Servicios Legales',
				fecha: new Date(o.completedAt || o.createdAt).toISOString().split('T')[0],
				importe: Number(o.total),
				estado: 'pagada' // Assuming completed orders are paid
			}));
	}, [orders]);

	const [loading, setLoading] = useState(false); // Managed by React Query
	const [filtroEstado, setFiltroEstado] = useState<
		'todas' | 'pagadas' | 'pendientes' | 'vencidas'
	>('todas');
	const [periodo, setPeriodo] = useState<PeriodoFacturacion>('mes');

	const [resumenFinanciero, setResumenFinanciero] = useState({
		ingresosMes: 0,
		ingresosTrimestre: 0,
		ingresosAnio: 0,
		pendienteCobro: 0,
		facturasPagadas: 0,
		facturasPendientes: 0,
		facturasVencidas: 0,
	});

	useEffect(() => {
		if (!facturas) return;

		// Calcular resumen financiero
		const ingresosPagados = facturas
			.filter((f) => f.estado === 'pagada')
			.reduce((sum, f) => sum + f.importe, 0);

		const importesPendientes = facturas
			.filter((f) => f.estado === 'pendiente' || f.estado === 'vencida')
			.reduce((sum, f) => sum + f.importe, 0);

		const facturasPagadas = facturas.filter(
			(f) => f.estado === 'pagada'
		).length;
		const facturasPendientes = facturas.filter(
			(f) => f.estado === 'pendiente'
		).length;
		const facturasVencidas = facturas.filter(
			(f) => f.estado === 'vencida'
		).length;

		setResumenFinanciero({
			ingresosMes: ingresosPagados,
			ingresosTrimestre: ingresosPagados * 3, // Simulación projection
			ingresosAnio: ingresosPagados * 12, // Simulación projection
			pendienteCobro: importesPendientes,
			facturasPagadas,
			facturasPendientes,
			facturasVencidas,
		});
	}, [facturas]);

	// Filtrar facturas según el estado seleccionado
	const facturasFiltradas = facturas.filter((factura) => {
		if (filtroEstado === 'todas') return true;
		if (filtroEstado === 'pagadas') return factura.estado === 'pagada';
		if (filtroEstado === 'pendientes') return factura.estado === 'pendiente';
		if (filtroEstado === 'vencidas') return factura.estado === 'vencida';
		return true;
	});

	// Función para obtener el color según el estado de la factura
	const obtenerColorEstado = (estado: string) => {
		switch (estado) {
			case 'pagada':
				return 'bg-green-100 text-green-800';
			case 'pendiente':
				return 'bg-yellow-100 text-yellow-800';
			case 'vencida':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// Función para formatear importes
	const formatearImporte = (importe: number) => {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'EUR',
		}).format(importe);
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
			<div className="bg-white rounded-lg shadow-sm p-6">
				<h2 className="text-lg font-medium text-gray-900 mb-6">
					Resumen Financiero
				</h2>

				<div className="flex items-center justify-end mb-4">
					<div className="flex items-center space-x-2">
						<span className="text-sm text-gray-500">Periodo:</span>
						<div className="relative">
							<select
								title="Seleccionar periodo de facturación"
								aria-label="Seleccionar periodo de facturación"
								value={periodo}
								onChange={(e) =>
									setPeriodo(e.target.value as PeriodoFacturacion)
								}
								className="appearance-none bg-gray-100 border border-gray-200 text-gray-700 py-1 px-3 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-azul-primario text-sm">
								<option value="mes">Este mes</option>
								<option value="trimestre">Este trimestre</option>
								<option value="año">Este año</option>
							</select>
							<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
								<FiChevronDown size={14} />
							</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<div className="bg-blue-50 rounded-lg p-4">
						<div className="flex items-center">
							<div className="flex-shrink-0 bg-blue-100 rounded-full p-3 mr-4">
								<FiDollarSign
									className="text-blue-600"
									size={20}
								/>
							</div>
							<div>
								<p className="text-sm text-gray-500">
									Ingresos{' '}
									{periodo === 'mes'
										? 'mensuales'
										: periodo === 'trimestre'
											? 'trimestrales'
											: 'anuales'}
								</p>
								<p className="text-xl font-bold text-gray-900">
									{formatearImporte(
										periodo === 'mes'
											? resumenFinanciero.ingresosMes
											: periodo === 'trimestre'
												? resumenFinanciero.ingresosTrimestre
												: resumenFinanciero.ingresosAnio
									)}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-yellow-50 rounded-lg p-4">
						<div className="flex items-center">
							<div className="flex-shrink-0 bg-yellow-100 rounded-full p-3 mr-4">
								<FiClock
									className="text-yellow-600"
									size={20}
								/>
							</div>
							<div>
								<p className="text-sm text-gray-500">Pendiente de cobro</p>
								<p className="text-xl font-bold text-gray-900">
									{formatearImporte(resumenFinanciero.pendienteCobro)}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-green-50 rounded-lg p-4">
						<div className="flex items-center">
							<div className="flex-shrink-0 bg-green-100 rounded-full p-3 mr-4">
								<FiPieChart
									className="text-green-600"
									size={20}
								/>
							</div>
							<div>
								<p className="text-sm text-gray-500">Facturas pagadas</p>
								<p className="text-xl font-bold text-gray-900">
									{resumenFinanciero.facturasPagadas}
								</p>
							</div>
						</div>
					</div>

					<div className="bg-red-50 rounded-lg p-4">
						<div className="flex items-center">
							<div className="flex-shrink-0 bg-red-100 rounded-full p-3 mr-4">
								<FiTrendingUp
									className="text-red-600"
									size={20}
								/>
							</div>
							<div>
								<p className="text-sm text-gray-500">
									Facturas pendientes/vencidas
								</p>
								<p className="text-xl font-bold text-gray-900">
									{resumenFinanciero.facturasPendientes +
										resumenFinanciero.facturasVencidas}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Lista de facturas */}
			<div className="bg-white rounded-lg shadow-sm overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
					<h2 className="text-lg font-medium text-gray-900">Mis Facturas</h2>
					<button className="bg-azul-primario text-white px-4 py-2 rounded-lg hover:bg-azul-primario/90 transition-colors flex items-center">
						<FiPlus className="mr-2" />
						Nueva factura
					</button>
				</div>

				{/* Filtros */}
				<div className="flex items-center gap-4 p-4 border-b border-gray-200">
					<div className="flex items-center">
						<FiFilter className="text-gray-500 mr-2" />
						<span className="text-gray-700 font-medium mr-2">Filtrar:</span>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => setFiltroEstado('todas')}
							className={`px-3 py-1 rounded-full text-sm ${filtroEstado === 'todas'
								? 'bg-azul-primario text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}>
							Todas
						</button>
						<button
							onClick={() => setFiltroEstado('pagadas')}
							className={`px-3 py-1 rounded-full text-sm ${filtroEstado === 'pagadas'
								? 'bg-green-500 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}>
							Pagadas
						</button>
						<button
							onClick={() => setFiltroEstado('pendientes')}
							className={`px-3 py-1 rounded-full text-sm ${filtroEstado === 'pendientes'
								? 'bg-yellow-500 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}>
							Pendientes
						</button>
						<button
							onClick={() => setFiltroEstado('vencidas')}
							className={`px-3 py-1 rounded-full text-sm ${filtroEstado === 'vencidas'
								? 'bg-red-500 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
								}`}>
							Vencidas
						</button>
					</div>
				</div>

				{/* Tabla de facturas */}
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Nº Factura
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Cliente
								</th>
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
									Importe
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Estado
								</th>
								<th
									scope="col"
									className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
									Acciones
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{facturasFiltradas.length === 0 ? (
								<tr>
									<td
										colSpan={7}
										className="px-6 py-4 text-center text-gray-500">
										No se encontraron facturas con los criterios de búsqueda.
									</td>
								</tr>
							) : (
								facturasFiltradas.map((factura) => (
									<tr
										key={factura.id}
										className="hover:bg-gray-50">
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{factura.numero}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{factura.cliente}
											</div>
										</td>
										<td className="px-6 py-4">
											<div className="text-sm text-gray-900">
												{factura.concepto}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm text-gray-900">
												{factura.fecha}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<div className="text-sm font-medium text-gray-900">
												{formatearImporte(factura.importe)}
											</div>
										</td>
										<td className="px-6 py-4 whitespace-nowrap">
											<span
												className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${obtenerColorEstado(
													factura.estado
												)}`}>
												{factura.estado === 'pagada' && 'Pagada'}
												{factura.estado === 'pendiente' && 'Pendiente'}
												{factura.estado === 'vencida' && 'Vencida'}
											</span>
										</td>
										<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
											<div className="flex justify-end space-x-2">
												<button
													className="text-azul-primario hover:text-azul-primario/80"
													title="Ver detalles">
													<FiEye size={18} />
												</button>

												<button
													className="text-gray-600 hover:text-gray-800"
													title="Descargar factura">
													<FiDownload size={18} />
												</button>

												{factura.estado !== 'pagada' && (
													<button
														className="text-green-600 hover:text-green-800"
														title="Marcar como pagada">
														<FiCheck size={18} />
													</button>
												)}
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
