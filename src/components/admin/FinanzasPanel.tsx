'use client';

import { memo } from 'react';
import {
	FiDollarSign,
	FiCreditCard,
	FiEye,
	FiPieChart,
	FiCalendar,
	FiArrowUpRight,
	FiArrowDownLeft,
	FiActivity,
	FiDownload
} from 'react-icons/fi';
import { formatUSD } from '@/lib/finance';
import { formatOrderId } from '@/lib/formatOrderId';
import { motion, AnimatePresence } from 'framer-motion';
import PayoutManagement from '@/features/finance/components/PayoutManagement';
import { useFinanzasPanel } from './hooks/useFinanzasPanel';
import { ElementoSeleccionable } from '@/types/index';

interface FinanzasPanelProps {
	terminoBusqueda: string;
	abrirModal: (
		tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar',
		elemento?: ElementoSeleccionable
	) => void;
}

function FinanzasPanel({ terminoBusqueda, abrirModal }: FinanzasPanelProps) {
	const {
		periodo,
		setPeriodo,
		tabActiva,
		setTabActiva,
		summary,
		ordenesFiltradas,
		isLoading,
	} = useFinanzasPanel(terminoBusqueda);

	const container = {
		hidden: { opacity: 0 },
		show: { opacity: 1, transition: { staggerChildren: 0.1 } }
	};

	const item = {
		hidden: { opacity: 0, y: 20 },
		show: { opacity: 1, y: 0 }
	};

	return (
		<div className="space-y-10">
			{/* KPIs Financieros Premium */}
			<motion.div 
				variants={container}
				initial="hidden"
				animate="show"
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
			>
				{[
					{ label: 'Ingresos Totales', value: summary?.totalIncome || 0, icon: <FiArrowUpRight />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
					{ label: 'Cuentas por Pagar', value: summary?.pendingLawyerPayments || 0, icon: <FiCreditCard />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
					{ label: 'Gastos e Impuestos', value: summary?.operationalCostsAndTaxes || 0, icon: <FiArrowDownLeft />, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
					{ label: 'Ganancia Proyectada', value: summary?.realProfit || 0, icon: <FiActivity />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
				].map((kpi, idx) => (
					<motion.div 
						key={idx}
						variants={item}
						className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm relative overflow-hidden group hover:shadow-md transition-all"
					>
						<div className={`absolute top-0 right-0 w-24 h-24 ${kpi.bg}/30 rounded-full blur-3xl -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700`} />
						
						<div className="flex items-center justify-between mb-4">
							<span className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color}`}>
								{kpi.icon}
							</span>
							<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
						</div>
						
						<div className="space-y-1">
							{isLoading ? (
								<div className="h-8 bg-slate-100 animate-pulse rounded-lg w-2/3" />
							) : (
								<p className={`text-2xl font-black tracking-tighter ${kpi.color}`}>
									{formatUSD(kpi.value)}
								</p>
							)}
						</div>
					</motion.div>
				))}
			</motion.div>

			{/* Controles y Filtros */}
			<div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
				<div className="bg-white/50 backdrop-blur-sm p-2 rounded-[2rem] border border-slate-200/60 shadow-sm w-full lg:w-auto overflow-x-auto no-scrollbar">
					<div className="flex items-center gap-2 min-w-max">
						<div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-inner mr-2 text-azul-primario">
							<FiCalendar />
							<span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Periodo</span>
						</div>
						<div className="flex gap-1.5">
							{(['hoy', 'semana', 'mes', 'año'] as const).map((p) => (
								<button
									key={p}
									onClick={() => setPeriodo(p)}
									className={`px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
										periodo === p
											? 'bg-azul-primario text-white shadow-lg shadow-azul-primario/20 scale-105'
											: 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'
									}`}
								>
									{p}
								</button>
							))}
						</div>
					</div>
				</div>

				<motion.button
					whileHover={{ scale: 1.02, y: -2 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => window.print()}
					className="w-full lg:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-white text-azul-primario border-2 border-azul-primario rounded-[2rem] font-black text-xs uppercase tracking-widest hover:bg-azul-primario hover:text-white transition-all shadow-sm"
				>
					<FiDownload size={18} />
					Exportar Balance
				</motion.button>
			</div>

            {/* TAB SELECTOR (Liquidaciones vs Operaciones) */}
            <div className="max-w-2xl mx-auto flex p-1.5 bg-slate-100 rounded-[2rem] border border-slate-200 mb-6">
                <button 
                    onClick={() => setTabActiva('operaciones')}
                    className={`flex-1 py-3 px-6 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all ${
                        tabActiva === 'operaciones' 
                        ? 'bg-white text-azul-primario shadow-lg' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    Libro de Operaciones
                </button>
                <button 
                    onClick={() => setTabActiva('liquidaciones')}
                    className={`flex-1 py-3 px-6 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all ${
                        tabActiva === 'liquidaciones' 
                        ? 'bg-white text-azul-primario shadow-lg' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                    Liquidaciones a Abogados
                </button>
            </div>

			{/* Listado Dinámico */}
			<div className="space-y-6">
                {tabActiva === 'operaciones' ? (
                <>
				<div className="flex items-center justify-between px-4">
					<h3 className="text-sm font-black text-azul-primario uppercase tracking-widest flex items-center gap-2">
						<FiPieChart className="text-indigo-500" />
						Libro de Operaciones
					</h3>
					<span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
						{ordenesFiltradas.length} Movimientos
					</span>
				</div>

				{/* Vista Móvil: Tarjetas de Transacción */}
				<motion.div 
					variants={container}
					initial="hidden"
					animate="show"
					className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden"
				>
					<AnimatePresence mode='popLayout'>
						{ordenesFiltradas.map((order) => (
							<motion.div
								layout
								key={order.id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className="bg-white p-6 rounded-[2.5rem] border border-slate-200/60 shadow-sm relative overflow-hidden group"
							>
								<div className="flex justify-between items-start mb-4">
									<div className="space-y-1">
										<p className="text-xs font-black text-azul-primario tracking-tighter">#{formatOrderId(order.numericId, order.createdAt)}</p>
										<p className="text-[10px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</p>
									</div>
									<span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
										order.status === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
									}`}>
										{order.status}
									</span>
								</div>

								<div className="space-y-3 mb-6">
									<div>
										<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Concepto</p>
										<p className="text-sm font-bold text-slate-600 truncate">{order.items?.[0]?.serviceName || 'Servicio Legal'}</p>
									</div>
									<div className="flex items-end justify-between pt-3 border-t border-slate-50">
										<div>
											<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cliente</p>
											<p className="text-sm font-black text-azul-primario">{order.userName}</p>
										</div>
										<p className="text-xl font-black text-slate-700 tracking-tighter">{formatUSD(order.total)}</p>
									</div>
								</div>

								<div className="flex gap-2">
									<button onClick={() => abrirModal('ver', order as any)} className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-azul-primario hover:text-white transition-all">
										Ver Detalle
									</button>
									<button onClick={() => abrirModal('editar', order as any)} className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all">
										<FiDollarSign size={18} />
									</button>
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</motion.div>

				{/* Vista Escritorio: Tabla Contable */}
				<div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 overflow-hidden">
					<div className="table-container p-1">
						<table className="min-w-[1100px] divide-y divide-slate-100 text-left">
						<thead className="bg-slate-50/50">
							<tr>
								<th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Referencia</th>
								<th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Titular</th>
								<th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Concepto de Pago</th>
								<th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha</th>
								<th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monto</th>
								<th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estado</th>
								<th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
							</tr>
                        </thead>
						<tbody className="divide-y divide-slate-100">
							<AnimatePresence mode='popLayout'>
								{ordenesFiltradas.map((order) => (
									<motion.tr 
										layout
										key={order.id} 
										className="group hover:bg-slate-50/30 transition-colors"
									>
										<td className="px-8 py-5 text-sm font-black text-azul-primario">
											#{formatOrderId(order.numericId, order.createdAt)}
										</td>
										<td className="px-8 py-5">
											<div className="space-y-0.5">
												<p className="text-sm font-black text-slate-700">{order.userName}</p>
												<p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{order.userEmail}</p>
											</div>
										</td>
										<td className="px-8 py-5">
											<p className="text-xs font-bold text-slate-600 truncate max-w-[200px]">
												{order.items?.[0]?.serviceName || 'Consulta Profesional'}
											</p>
										</td>
										<td className="px-8 py-5 text-xs font-bold text-slate-400">
											{new Date(order.createdAt).toLocaleDateString()}
										</td>
										<td className="px-8 py-5">
											<span className="text-sm font-black text-slate-800 tracking-tight">
												{formatUSD(order.total)}
											</span>
										</td>
										<td className="px-8 py-5">
											<span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
												order.status === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
											}`}>
												{order.status}
											</span>
										</td>
										<td className="px-8 py-5 text-right">
											<div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
												<motion.button whileHover={{ scale: 1.1 }} onClick={() => abrirModal('ver', order as any)} className="p-2 bg-slate-100 text-slate-500 rounded-lg">
													<FiEye size={18} />
												</motion.button>
												<motion.button whileHover={{ scale: 1.1 }} onClick={() => abrirModal('editar', order as any)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
													<FiDollarSign size={18} />
												</motion.button>
											</div>
										</td>
									</motion.tr>
								))}
							</AnimatePresence>
						</tbody>
					</table>
				</div>
			</div>

				{ordenesFiltradas.length === 0 && !isLoading && (
					<div className="text-center py-24 bg-white rounded-[3rem] border border-slate-200/60 shadow-sm">
						<div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
							<FiPieChart className="text-slate-300" size={48} />
						</div>
						<h3 className="text-xl font-black text-azul-primario uppercase tracking-tight">Sin movimientos</h3>
						<p className="text-slate-400 text-sm mt-1">No se detectaron transacciones en el periodo consultado.</p>
					</div>
				)}
                </>
                ) : (
                    <PayoutManagement />
                )}
			</div>
		</div>
	);
}

export default memo(FinanzasPanel);
