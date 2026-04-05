'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrdersByLawyer, useUpdateOrder } from '@/features/orders/hooks/useOrders';
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
	FiPlus,
	FiX,
	FiFileText,
	FiUser,
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

import { OrderStatus } from '@/features/orders/types/orders.types';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { formatUSD } from '@/lib/finance';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQuery } from '@tanstack/react-query';
import PayoutHistoryList from '@/features/finance/components/PayoutHistoryList';

interface FacturacionPanelProps {
	abogadoId: string;
}

interface Factura {
	id: string;
	numero: string;
	cliente: string;
	clienteEmail: string;
	concepto: string;
	fecha: string;
	importe: number;
	estado: 'pagada' | 'pendiente' | 'vencida';
}

// Tipo para el periodo de facturación
type PeriodoFacturacion = 'mes' | 'trimestre' | 'año';

export default function FacturacionPanel({ abogadoId }: FacturacionPanelProps) {
	// Use real orders as invoices
	// Use real orders as invoices
	const user = useAuthStore(state => state.user);
	const { data: response, isLoading: isLoadingOrders } = useOrdersByLawyer(abogadoId);
	const orders = response?.data || [];
	const updateOrder = useUpdateOrder(); 
	const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
	const [mostrarModalConfirmacion, setMostrarModalConfirmacion] = useState(false);
	const [notificacion, setNotificacion] = useState<{tipo: 'success' | 'info', mensaje: string} | null>(null);

	const [periodo, setPeriodo] = useState<PeriodoFacturacion>('mes');

	// ============ REACT QUERY (Resumen Financiero Real) ============
	const { data: summary, isLoading: isLoadingSummary } = useQuery({
		queryKey: ['Finance', periodo, abogadoId],
		queryFn: () => getFinancialSummary({ lawyerId: abogadoId, dateRange: periodo as any }, { id: user!.id, rol: user!.rol as any }),
		enabled: !!user
	});

	// Derive invoices from ALL relevant orders
	const facturas: Factura[] = useMemo(() => {
		return orders
			.filter(o => ['PAID', 'EN_PROGRESO', 'REVISION', 'COMPLETADO'].includes(o.status))
			.map(o => ({
				id: o.id.toString(),
				numero: `F-${o.numericId || o.id.toString().slice(0, 8)}`,
				cliente: o.userName || 'Cliente',
				clienteEmail: o.userEmail || '',
				concepto: o.items?.[0]?.serviceName || 'Servicios Legales',
				fecha: new Date(o.createdAt).toISOString().split('T')[0],
				importe: Number(o.total),
				estado: o.status === OrderStatus.COMPLETADO ? 'pagada' : 'pendiente'
			}));
	}, [orders]);

	const [filtroEstado, setFiltroEstado] = useState<
		'todas' | 'pagadas' | 'pendientes' | 'vencidas'
	>('todas');

	const isLoading = isLoadingOrders || isLoadingSummary;

	const handleDescargar = (factura: Factura) => {
		setNotificacion({
			tipo: 'info',
			mensaje: `Generando PDF para ${factura.numero}...`
		});
		
		// Real-ish behavior: open print dialog or generate simple blob
		setTimeout(() => {
			window.print();
			setNotificacion({
				tipo: 'success',
				mensaje: `Factura ${factura.numero} lista para imprimir.`
			});
		}, 1000);
	};

	const handleMarcarPagada = (factura: Factura) => {
		setFacturaSeleccionada(factura);
		setMostrarModalConfirmacion(true);
	};

	const confirmarPago = async () => {
		if (!facturaSeleccionada) return;
		
		try {
			// Real update in DB
			await updateOrder.mutateAsync({
				id: facturaSeleccionada.id,
				data: { 
					status: OrderStatus.COMPLETADO,
					closedAt: new Date().toISOString()
				}
			});

			setNotificacion({
				tipo: 'success',
				mensaje: `Factura ${facturaSeleccionada.numero} marcada como pagada exitosamente.`
			});
			setMostrarModalConfirmacion(false);
			setFacturaSeleccionada(null);
		} catch (error) {
			console.error('Error al actualizar factura:', error);
			setNotificacion({
				tipo: 'info', // Using info for error because it matches the blue style
				mensaje: 'Error al actualizar el estado de la factura.'
			});
		}
	};

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
						className={`fixed top-6 right-6 z-[100] p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20 backdrop-blur-md ${
							notificacion.tipo === 'success' ? 'bg-emerald-600 text-white' : 'bg-azul-primario text-white'
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
						{ label: 'Ingresos Totales', value: summary?.totalIncome || 0, icon: <FiDollarSign />, color: 'azul-primario', bg: 'bg-azul-primario/5' },
						{ label: 'En Espera', value: summary?.lawyerPendingBalance || 0, icon: <FiClock />, color: 'amber-500', bg: 'bg-amber-500/5' },
						{ label: 'Transacciones', value: summary?.transactionCount || 0, icon: <FiCheck />, color: 'emerald-500', bg: 'bg-emerald-50/5', isAmount: false },
						{ label: 'Pago a Recibir', value: (summary?.totalIncome || 0) + (summary?.lawyerPendingBalance || 0), icon: <FiTrendingUp />, color: 'rose-500', bg: 'bg-rose-500/5' }
					].map((stat, i) => ( stat && (
						<div key={i} className={`${stat.bg} rounded-3xl p-6 border border-slate-50 transition-all hover:scale-[1.02]`}>
							<div className="flex items-center gap-4 mb-4">
								<div className={`w-10 h-10 rounded-xl flex items-center justify-center text-${stat.color} bg-white shadow-sm font-black`}>
									{stat.icon}
								</div>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
							</div>
							<p className={`text-2xl font-black text-slate-800 tracking-tighter`}>
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
					<h2 className="text-xl font-black text-slate-800 tracking-tight">Historial de Cobros</h2>
					<button 
						onClick={() => setNotificacion({tipo: 'info', mensaje: 'Módulo de creación de facturas (Próximamente)'})}
						className="bg-azul-primario text-white px-6 py-3 rounded-2xl hover:bg-azul-primario/90 transition-all flex items-center justify-center shadow-lg shadow-azul-primario/25 font-black text-xs uppercase tracking-widest active:scale-95">
						<FiPlus className="mr-2" size={18} />
						Nueva factura
					</button>
				</div>

				{/* Filtros Adaptativos */}
				<div className="flex items-center gap-3 p-6 bg-slate-50 border-b border-slate-100 overflow-x-auto scrollbar-hide">
					<FiFilter className="text-slate-400 shrink-0" />
					<div className="flex gap-2 min-w-max">
						{[
							{ id: 'todas', label: 'Todas', color: 'bg-azul-primario' },
							{ id: 'pagadas', label: 'Pagadas', color: 'bg-emerald-500' },
							{ id: 'pendientes', label: 'Pendientes', color: 'bg-amber-500' },
							{ id: 'vencidas', label: 'Vencidas', color: 'bg-rose-500' }
						].map((btn) => (
							<button
								key={btn.id}
								onClick={() => setFiltroEstado(btn.id as any)}
								className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filtroEstado === btn.id
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
										{factura.estado}
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
										<p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Importe</p>
										<p className="text-lg font-black text-azul-primario leading-none mt-1">{formatearImporte(factura.importe)}</p>
									</div>
									<div className="flex gap-2">
										<button 
											onClick={() => setFacturaSeleccionada(factura)}
											className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-90"
										>
											<FiEye size={18} />
										</button>
										<button 
											onClick={() => handleDescargar(factura)}
											className="w-10 h-10 bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center transition-all active:scale-90"
										>
											<FiDownload size={18} />
										</button>
										{factura.estado !== 'pagada' && (
											<button 
												onClick={() => handleMarcarPagada(factura)}
												className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center transition-all active:scale-90"
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
								<th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Importe</th>
								<th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
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
												{formatearImporte(factura.importe)}
											</div>
										</td>
										<td className="px-8 py-6 whitespace-nowrap">
											<span className={`px-4 py-1.5 inline-flex text-[9px] font-black uppercase tracking-widest rounded-xl ${obtenerColorEstado(factura.estado).replace('100', '500').replace('800', 'white')}`}>
												{factura.estado}
											</span>
										</td>
										<td className="px-8 py-6 whitespace-nowrap text-right">
											<div className="flex justify-end gap-2 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
												<button
													onClick={() => setFacturaSeleccionada(factura)}
													className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-azul-primario rounded-xl hover:bg-azul-primario hover:text-white transition-all flex items-center justify-center"
												>
													<FiEye size={18} />
												</button>
												<button
													onClick={() => handleDescargar(factura)}
													className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center"
												>
													<FiDownload size={18} />
												</button>
												{factura.estado !== 'pagada' && (
													<button
														onClick={() => handleMarcarPagada(factura)}
														className="w-10 h-10 bg-white shadow-sm border border-slate-100 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center"
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
								<button 
									onClick={() => setFacturaSeleccionada(null)} 
									className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all font-black"
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
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Estado</p>
										<span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${obtenerColorEstado(facturaSeleccionada.estado).replace('100', '500').replace('800', 'white')}`}>
											{facturaSeleccionada.estado}
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
										<p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Monto de Liquidación</p>
										<p className="text-4xl font-black text-azul-primario tracking-tighter leading-none">{formatearImporte(facturaSeleccionada.importe)}</p>
									</div>
									<FiDollarSign className="text-azul-primario/10" size={64} />
								</div>
							</div>
							<div className="bg-slate-50 px-10 py-6 flex gap-4">
								<button 
									onClick={() => handleDescargar(facturaSeleccionada)}
									className="flex-1 bg-azul-primario text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:shadow-xl hover:shadow-azul-primario/25 transition-all flex items-center justify-center gap-3 shadow-lg shadow-azul-primario/20 active:scale-95"
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
				isLoading={updateOrder.isPending}
			/>
		</div>
	);
}
