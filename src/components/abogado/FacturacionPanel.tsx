'use client';

import {
	FiDollarSign,
	FiDownload,
	FiFilter,
	FiChevronDown,
	FiClock,
	FiPieChart,
	FiTrendingUp,
	FiEye,
	FiCheck,

	FiX,
	FiFileText,
	FiUser,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '@/components/ui/ConfirmModal';

import { formatUSD } from '@/lib/finance';
import PayoutHistoryList from '@/features/finance/components/PayoutHistoryList';
import { useFacturacionPanel, Factura, PeriodoFacturacion } from './hooks/useFacturacionPanel';

interface FacturacionPanelProps {
	abogadoId: string;
}

export default function FacturacionPanel({ abogadoId }: FacturacionPanelProps) {
	const {
		summary,
		facturasFiltradas,
		isLoading,
		notificacion,
		periodo,
		setPeriodo,
		filtroEstado,
		setFiltroEstado,
		facturaSeleccionada,
		setFacturaSeleccionada,
		mostrarModalConfirmacion,
		setMostrarModalConfirmacion,
		handleDescargar,
		handleMarcarPagada,
		confirmarPago,
		isUpdating,
	} = useFacturacionPanel(abogadoId);



	// Función para obtener el color según el estado de la factura
	const obtenerColorEstado = (estado: string) => {
		switch (estado) {
			case 'liquidada':
				return 'bg-green-100 text-green-800';
			case 'procesando':
				return 'bg-blue-100 text-blue-800';
			case 'por_liquidar':
				return 'bg-amber-100 text-amber-800';
			case 'pendiente':
				return 'bg-slate-100 text-slate-800';
			case 'vencida':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	// Función para formatear importes
	const formatearImporte = (importe: number) => {
		return formatUSD(importe);
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Notificación Premium */}
			<AnimatePresence>
				{notificacion && (
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className={`fixed top-6 right-6 z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md ${notificacion.tipo === 'success' ? 'bg-emerald-600 text-white' : 'bg-azul-primario text-white'
							}`}>
						<div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">
							{notificacion.tipo === 'success' ? <FiCheck /> : <FiClock />}
						</div>
						<span className="font-bold text-sm tracking-tight">{notificacion.mensaje}</span>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Cabecera y Resumen Financiero */}
			<div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-8">
				<div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
					<h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
						<div className="w-10 h-10 bg-azul-primario/10 rounded-xl flex items-center justify-center text-azul-primario">
							<FiPieChart size={22} />
						</div>
						Finanzas & Facturación
					</h2>

					<div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 self-end md:self-auto">
						<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Periodo:</span>
						<div className="relative">
							<select
								value={periodo}
								onChange={(e) => setPeriodo(e.target.value as PeriodoFacturacion)}
								className="appearance-none bg-white border-none text-slate-700 py-1.5 px-4 pr-10 rounded-xl leading-tight focus:ring-2 focus:ring-azul-primario text-xs font-black uppercase tracking-tight shadow-sm cursor-pointer">
								<option value="mes">Mensual</option>
								<option value="trimestre">Trimestral</option>
								<option value="año">Anual</option>
							</select>
							<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-azul-primario">
								<FiChevronDown size={14} />
							</div>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
					{[
						{ label: 'Honorarios Totales (Sin Deduc.)', value: summary?.totalIncome || 0, icon: <FiPieChart />, color: 'slate-400', bg: 'bg-slate-50' },
						{ label: 'Honorarios Generados (Neto)', value: (summary as any)?.lawyerTotalEarned || 0, icon: <FiTrendingUp />, color: 'emerald-600', bg: 'bg-emerald-500/5' },
						{ label: 'Casos Finalizados', value: summary?.transactionCount || 0, icon: <FiCheck />, color: 'emerald-600', bg: 'bg-emerald-500/5', isAmount: false },
						{ label: 'Saldo Disponible para Cobro', value: summary?.lawyerPendingBalance || 0, icon: <FiDollarSign />, color: 'azul-primario', bg: 'bg-azul-primario/5' }
					].map((stat, i) => (stat && (
						<div key={stat.label} className={`${stat.bg} rounded-3xl p-6 border border-slate-50 shadow-sm transition hover:scale-[1.02]`}>
							<div className="flex items-center gap-4 mb-4">
								<div className={`w-10 h-10 rounded-xl flex items-center justify-center text-${stat.color} bg-white shadow-sm font-black`}>
									{stat.icon}
								</div>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
							</div>
							<p className={`text-2xl font-black ${i === 3 ? 'text-azul-primario' : 'text-slate-800'} tracking-tighter`}>
								{stat.isAmount !== false ? formatearImporte(stat.value as number) : stat.value}
							</p>
						</div>
					)))}
				</div>
			</div>

			{/* HISTORIAL DE LIQUIDACIONES RECIBIDAS (NUEVO) */}
			<div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 md:p-8">
				<h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 mb-6">
					<div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
						<FiCheck size={20} />
					</div>
					Liquidaciones de Honorarios Recibidas
				</h3>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<PayoutHistoryList lawyerId={abogadoId} />
				</div>
			</div>

			{/* Listado de Facturas */}
			<div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
				<div className="px-8 py-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
					<h2 className="text-xl font-black text-slate-800 tracking-tight">Honorarios por Servicios</h2>

				</div>

				{/* Filtros Adaptativos */}
				<div className="flex items-center gap-3 p-6 bg-slate-50 border-b border-slate-100 overflow-x-auto scrollbar-hide">
					<FiFilter className="text-slate-400 shrink-0" />
					<div className="flex gap-2 min-w-max">
						{[
							{ id: 'todas', label: 'Todas', color: 'bg-azul-primario' },
							{ id: 'por_liquidar', label: 'Por Liquidar', color: 'bg-amber-500' },
							{ id: 'procesando', label: 'En Proceso', color: 'bg-blue-500' },
							{ id: 'liquidada', label: 'Transferidas', color: 'bg-emerald-500' },
							{ id: 'pendientes', label: 'Pendientes', color: 'bg-slate-400' }
						].map((btn) => (
							<button type="button"
								key={btn.id}
								onClick={() => setFiltroEstado(btn.id as any)}
								className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition ${filtroEstado === btn.id
									? `${btn.color} text-white shadow-md`
									: 'bg-white text-slate-500 hover:text-azul-primario'
									}`}>
								{btn.label}
							</button>
						))}
					</div>
				</div>

				{/* VISTA MÓVIL (Cards) */}
				<div className="lg:hidden p-4 space-y-4 pb-12">
					{facturasFiltradas.length === 0 ? (
						<div className="py-16 text-center">
							<p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Sin resultados</p>
						</div>
					) : (
						facturasFiltradas.map((factura) => (
							<div key={factura.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative group overflow-hidden">
								<div className="flex justify-between items-start mb-4">
									<div>
										<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Factura</span>
										<h4 className="font-black text-slate-800 text-sm tracking-tight">{factura.numero}</h4>
									</div>
									<span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter ${obtenerColorEstado(factura.estado).replace('100', '500').replace('800', 'white')}`}>
										{factura.estado.replace('_', ' ')}
									</span>
								</div>

								<div className="space-y-3 mb-5">
									<div className="flex items-center gap-2">
										<div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
											<FiUser size={12} />
										</div>
										<span className="text-xs font-bold text-slate-600 truncate">{factura.cliente}</span>
									</div>
									<div className="flex items-center gap-2">
										<div className="w-6 h-6 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
											<FiFileText size={12} />
										</div>
										<span className="text-[11px] font-medium text-slate-500 truncate">{factura.concepto}</span>
									</div>
								</div>

								<div className="flex items-center justify-between pt-4 border-t border-slate-50">
									<div>
										<p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Tu Honorario</p>
										<p className="text-lg font-black text-azul-primario leading-none mt-1">{formatearImporte(factura.importeNeto)}</p>
										<p className="text-[9px] text-slate-400 mt-1 font-bold">Total Bruto: {formatearImporte(factura.importeBruto)}</p>
									</div>
									<div className="flex gap-2">
										<button type="button"
											onClick={() => setFacturaSeleccionada(factura)}
											className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center transition active:scale-90"
										>
											<FiEye size={18} />
										</button>
										<button type="button"
											onClick={() => handleDescargar(factura)}
											className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center transition active:scale-90"
										>
											<FiDownload size={18} />
										</button>
										{factura.estado === 'pendiente' && (
											<button type="button"
												onClick={() => handleMarcarPagada(factura)}
												className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center transition active:scale-90"
											>
												<FiCheck size={18} />
											</button>
										)}
									</div>
								</div>
							</div>
						))
					)}
				</div>

				{/* VISTA DESKTOP (Tabla) */}
				<div className="hidden lg:block">
					<div className="table-container p-1">
						<table className="min-w-[1000px] divide-y divide-slate-50">
							<thead className="bg-slate-50/30">
								<tr>
									<th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº Factura</th>
									<th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente / Concepto</th>
									<th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
									<th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tus Honorarios (Neto)</th>
									<th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Liquidación</th>
									<th className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</th>
								</tr>
							</thead>
							<tbody className="bg-white divide-y divide-slate-50">
								{facturasFiltradas.length === 0 ? (
									<tr>
										<td colSpan={7} className="px-8 py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">
											No hay facturas registradas
										</td>
									</tr>
								) : (
									facturasFiltradas.map((factura) => (
										<tr key={factura.id} className="hover:bg-slate-50/50 transition-colors group">
											<td className="px-8 py-6 whitespace-nowrap">
												<div className="text-sm font-black text-slate-800">{factura.numero}</div>
												<div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Expediente Digital</div>
											</td>
											<td className="px-8 py-6">
												<div className="text-sm font-black text-slate-700">{factura.cliente}</div>
												<div className="text-xs text-azul-primario font-bold tracking-tight truncate max-w-[200px]">{factura.concepto}</div>
											</td>
											<td className="px-8 py-6 whitespace-nowrap">
												<div className="text-sm text-slate-500 font-black flex items-center">
													<FiClock className="mr-1.5 text-slate-300" size={14} />
													{factura.fecha}
												</div>
											</td>
											<td className="px-8 py-6 whitespace-nowrap">
												<div className="text-base font-black text-slate-800">
													{formatearImporte(factura.importeNeto)}
												</div>
												<div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Bruto: {formatearImporte(factura.importeBruto)}</div>
											</td>
											<td className="px-8 py-6 whitespace-nowrap">
												<span className={`px-4 py-1.5 inline-flex text-[9px] font-black uppercase tracking-widest rounded-xl ${obtenerColorEstado(factura.estado).replace('100', '500').replace('800', 'white')}`}>
													{factura.estado.replace('_', ' ')}
												</span>
											</td>
											<td className="px-8 py-6 whitespace-nowrap text-right">
												<div className="flex justify-end gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition duration-300">
													<button type="button"
														onClick={() => setFacturaSeleccionada(factura)}
														className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-azul-primario rounded-xl hover:bg-azul-primario hover:text-white transition flex items-center justify-center"
													>
														<FiEye size={18} />
													</button>
													<button type="button"
														onClick={() => handleDescargar(factura)}
														className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-white transition flex items-center justify-center"
													>
														<FiDownload size={18} />
													</button>
													{factura.estado === 'pendiente' && (
														<button type="button"
															onClick={() => handleMarcarPagada(factura)}
															className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition flex items-center justify-center"
														>
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

			{/* Modal de Detalles Premium */}
			<AnimatePresence>
				{facturaSeleccionada && !mostrarModalConfirmacion && (
					<div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
						<motion.div
							initial={{ scale: 0.9, opacity: 0, y: 20 }}
							animate={{ scale: 1, opacity: 1, y: 0 }}
							exit={{ scale: 0.9, opacity: 0, y: 20 }}
							className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
							<div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-azul-primario/5">
								<div>
									<h3 className="text-xl font-black text-azul-primario tracking-tight flex items-center gap-2">
										<FiFileText /> Detalles del Cobro
									</h3>
									<p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">Documento ID: {facturaSeleccionada.numero}</p>
								</div>
								<button type="button"
									onClick={() => setFacturaSeleccionada(null)}
									className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition font-black"
								>
									<FiX size={20} />
								</button>
							</div>
							<div className="p-10 space-y-8">
								<div className="grid grid-cols-2 gap-8">
									<div>
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Emisión</p>
										<p className="font-black text-slate-800 text-sm italic">{facturaSeleccionada.fecha}</p>
									</div>
									<div className="text-right">
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Estado Liquidación</p>
										<span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${obtenerColorEstado(facturaSeleccionada.estado).replace('100', '500').replace('800', 'white')}`}>
											{facturaSeleccionada.estado.replace('_', ' ')}
										</span>
									</div>
									<div className="col-span-2 p-5 bg-slate-50 rounded-3xl border border-slate-100">
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2">Cliente Asignado</p>
										<p className="font-black text-slate-800 text-base">{facturaSeleccionada.cliente}</p>
										<p className="text-xs font-bold text-azul-primario mt-0.5">{facturaSeleccionada.clienteEmail}</p>
									</div>
									<div className="col-span-2">
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-2">Servicio Prestado</p>
										<p className="font-bold text-slate-600 text-sm leading-relaxed">{facturaSeleccionada.concepto}</p>
									</div>
								</div>

								<div className="pt-8 border-t border-slate-100 flex justify-between items-end">
									<div>
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Tu Honorario Neto</p>
										<p className="text-4xl font-black text-azul-primario tracking-tighter leading-none">{formatearImporte(facturaSeleccionada.importeNeto)}</p>
										<p className="text-xs font-bold text-slate-400 mt-2 italic">Basado en un bruto de {formatearImporte(facturaSeleccionada.importeBruto)}</p>
									</div>
									<FiDollarSign className="text-azul-primario/10" size={64} />
								</div>
							</div>
							<div className="bg-slate-50 px-10 py-6 flex gap-4">
								<button type="button"
									onClick={() => handleDescargar(facturaSeleccionada)}
									className="flex-1 bg-azul-primario text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-azul-primario/25 transition flex items-center justify-center gap-3 shadow-lg shadow-azul-primario/20 active:scale-95"
								>
									<FiDownload size={18} /> Descargar PDF
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			<ConfirmModal
				isOpen={mostrarModalConfirmacion}
				onClose={() => setMostrarModalConfirmacion(false)}
				onConfirm={confirmarPago}
				title="Confirmar Pago"
				message={`¿Confirmas que has recibido el pago para la liquidación ${facturaSeleccionada?.numero}? Esta acción actualizará tu balance contable.`}
				confirmText="Sí, Conciliar Pago"
				isLoading={isUpdating}
			/>
		</div>
	);
}
