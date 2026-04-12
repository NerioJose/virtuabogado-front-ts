'use client';

import React, { memo, useMemo } from 'react';
import {
	FiUsers,
	FiUserCheck,
	FiBriefcase,
	FiDollarSign,
	FiAlertCircle,
	FiCheckCircle,
	FiClock,
	FiTrendingUp,
	FiTrendingDown,
} from 'react-icons/fi';
import { formatUSD } from '@/lib/finance';
import { motion } from 'framer-motion';
import { useDashboardStats, DashboardStatsData } from './hooks/useDashboardStats';


// Skeleton shimmer para tarjetas en carga
const SkeletonCard = () => (
	<div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 animate-pulse">
		<div className="flex items-center justify-between">
			<div className="space-y-3">
				<div className="h-4 bg-slate-100 rounded-full w-24"></div>
				<div className="h-8 bg-slate-200 rounded-xl w-16"></div>
			</div>
			<div className="w-12 h-12 rounded-2xl bg-slate-100"></div>
		</div>
		<div className="mt-6 h-4 bg-slate-100 rounded-full w-32"></div>
	</div>
);

// Componente para tarjetas de estadísticas Premium
interface StatCardProps {
	title: string;
	value: string | number;
	icon: React.ReactNode;
	bgColor: string;
	iconColor: string;
	subtitle?: {
		text: string;
		icon: React.ReactNode;
		color: string;
	};
}

const StatCard = memo(
	({ title, value, icon, bgColor, iconColor, subtitle }: StatCardProps) => (
		<motion.div 
			whileHover={{ y: -5 }}
			className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-6 hover:shadow-xl hover:shadow-azul-primario/5 transition-all duration-300 group"
		>
			<div className="flex items-center justify-between">
				<div>
					<p className="text-slate-400 text-xs font-black uppercase tracking-widest">{title}</p>
					<p className="text-3xl font-black text-azul-primario mt-2 tracking-tight">
						{value}
					</p>
				</div>
				<div className={`${bgColor} w-14 h-14 rounded-[1.2rem] flex items-center justify-center text-2xl ${iconColor} shadow-inner group-hover:scale-110 transition-transform duration-500`}>
					{icon}
				</div>
			</div>
			{subtitle && (
				<div className="mt-6 flex items-center text-[10px] md:text-sm font-bold bg-slate-50 p-2 rounded-xl">
					<div className={`${subtitle.color} mr-2`}>{subtitle.icon}</div>
					<span className={subtitle.color}>{subtitle.text}</span>
				</div>
			)}
		</motion.div>
	)
);

StatCard.displayName = 'StatCard';

// Componente para la barra de progreso de casos Premium
const CaseProgressBar = memo(
	({
		casosActivos,
		casosPendientes,
		casosCompletados,
		totalCasos,
	}: {
		casosActivos: number;
		casosPendientes: number;
		casosCompletados: number;
		totalCasos: number;
	}) => {
		const percentageActivos = totalCasos > 0 ? (casosActivos / totalCasos) * 100 : 0;
		const percentagePendientes = totalCasos > 0 ? (casosPendientes / totalCasos) * 100 : 0;
		const percentageCompletados = totalCasos > 0 ? (casosCompletados / totalCasos) * 100 : 0;

		return (
			<div className="mt-8">
				<div className="flex justify-between items-center mb-3">
					<span className="text-xs font-black text-slate-400 uppercase tracking-widest">Distribución del Flujo</span>
					<span className="text-xs font-black text-azul-primario px-3 py-1 bg-azul-primario/5 rounded-full">{totalCasos} TOTAL</span>
				</div>
				<div className="h-6 bg-slate-100 rounded-2xl overflow-hidden p-1 shadow-inner">
					<div className="flex h-full rounded-xl overflow-hidden">
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${percentageActivos}%` }}
							className="bg-azul-primario h-full relative group cursor-help"
							title={`Activos: ${casosActivos}`}
						/>
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${percentagePendientes}%` }}
							className="bg-amber-500 h-full relative group cursor-help border-l border-white/20"
							title={`Pendientes: ${casosPendientes}`}
						/>
						<motion.div
							initial={{ width: 0 }}
							animate={{ width: `${percentageCompletados}%` }}
							className="bg-emerald-500 h-full relative group cursor-help border-l border-white/20"
							title={`Completados: ${casosCompletados}`}
						/>
					</div>
				</div>
				<div className="flex flex-wrap gap-4 mt-4 text-[10px] font-black uppercase tracking-tighter">
					<div className="flex items-center gap-1.5 text-azul-primario">
						<div className="w-3 h-3 rounded-full bg-azul-primario shadow-sm" /> Activos ({casosActivos})
					</div>
					<div className="flex items-center gap-1.5 text-amber-500">
						<div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" /> Pendientes ({casosPendientes})
					</div>
					<div className="flex items-center gap-1.5 text-emerald-500">
						<div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" /> Completados ({casosCompletados})
					</div>
				</div>
			</div>
		);
	}
);

CaseProgressBar.displayName = 'CaseProgressBar';

function DashboardStats() {
	const { stats, isLoading } = useDashboardStats();

	const totalCasos = stats.totalCasos;

	const container = {
		hidden: { opacity: 0 },
		show: {
			opacity: 1,
			transition: { staggerChildren: 0.1 }
		}
	};

	return (
		<div className="space-y-10">
			<div className="flex justify-between items-center px-1">
				<h2 className="text-xl md:text-2xl font-black text-azul-primario uppercase tracking-tight">Métricas Críticas</h2>
				{isLoading && <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">
					<div className="w-2 h-2 rounded-full bg-azul-primario animate-ping" /> Sincronizando
				</div>}
			</div>

			<motion.div 
				variants={container}
				initial="hidden"
				animate="show"
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
			>
				{isLoading ? (
					[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
				) : (
					<>
						<StatCard
							title="Cuerpo Legal"
							value={stats.totalAbogados}
							icon={<FiUserCheck />}
							bgColor="bg-blue-50"
							iconColor="text-blue-600"
							subtitle={{
								text: `${stats.abogadosPendientes} por aprobar`,
								icon: <FiAlertCircle />,
								color: 'text-amber-600',
							}}
						/>
						<StatCard
							title="Base Clientes"
							value={stats.totalClientes}
							icon={<FiUsers />}
							bgColor="bg-emerald-50"
							iconColor="text-emerald-600"
							subtitle={{
								text: `+${stats.clientesNuevosMes} este periodo`,
								icon: <FiCheckCircle />,
								color: 'text-emerald-600',
							}}
						/>
						<StatCard
							title="Operativa Activa"
							value={stats.casosActivos}
							icon={<FiBriefcase />}
							bgColor="bg-indigo-50"
							iconColor="text-indigo-600"
							subtitle={{
								text: `${stats.casosPendientes} sin asignar`,
								icon: <FiClock />,
								color: 'text-amber-600',
							}}
						/>
						<StatCard
							title="Liquidez Mensual"
							value={formatUSD(stats.ingresosMes)}
							icon={<FiDollarSign />}
							bgColor="bg-rose-50"
							iconColor="text-rose-600"
							subtitle={{
								text: `Flujo positivo detectado`,
								icon: <FiTrendingUp />,
								color: 'text-emerald-600',
							}}
						/>
					</>
				)}
			</motion.div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				<motion.div 
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 p-8 flex flex-col justify-between"
				>
					<div>
						<h3 className="text-lg font-black text-azul-primario uppercase tracking-tight mb-8">
							Monitoreo de Casos
						</h3>
						<div className="flex justify-between items-center px-4">
							<div className="text-center group cursor-default">
								<p className="text-3xl font-black text-azul-primario group-hover:scale-110 transition-transform duration-300">
									{stats.casosActivos}
								</p>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Activos</p>
							</div>
							<div className="w-px h-10 bg-slate-100 hidden sm:block" />
							<div className="text-center group cursor-default">
								<p className="text-3xl font-black text-amber-500 group-hover:scale-110 transition-transform duration-300">
									{stats.casosPendientes}
								</p>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Espera</p>
							</div>
							<div className="w-px h-10 bg-slate-100 hidden sm:block" />
							<div className="text-center group cursor-default">
								<p className="text-3xl font-black text-emerald-500 group-hover:scale-110 transition-transform duration-300">
									{stats.casosCompletados}
								</p>
								<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Éxito</p>
							</div>
						</div>
					</div>
					<CaseProgressBar
						casosActivos={stats.casosActivos}
						casosPendientes={stats.casosPendientes}
						casosCompletados={stats.casosCompletados}
						totalCasos={totalCasos}
					/>
				</motion.div>

				<motion.div 
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					className="bg-gradient-to-br from-azul-primario to-azul-primario/90 rounded-[2.5rem] shadow-2xl p-8 text-white relative overflow-hidden"
				>
					<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-10 -mt-10" />
					<div className="relative z-10">
						<h3 className="text-lg font-black uppercase tracking-tight mb-8">
							Informe de Tesorería
						</h3>
						<div className="space-y-6">
							<div className="flex justify-between items-center">
								<span className="text-xs font-bold text-white/60 uppercase tracking-widest">Facturación Bruta</span>
								<span className="text-xl font-black tracking-tight">{formatUSD(stats.ingresosTotales)}</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-xs font-bold text-white/60 uppercase tracking-widest">Compromisos Abogados</span>
								<span className="text-lg font-black text-amber-300">-{formatUSD(stats.pagosAbogados)}</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-xs font-bold text-white/60 uppercase tracking-widest">Tributos y Operativa</span>
								<span className="text-lg font-black text-rose-300">-{formatUSD(stats.gastosOperativos)}</span>
							</div>
							<div className="pt-6 border-t border-white/20 flex justify-between items-center">
								<div className="flex flex-col">
									<span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Utilidad Proyectada</span>
									<span className="text-4xl font-black tracking-tighter mt-1 drop-shadow-lg">
										{formatUSD(stats.gananciasNetas)}
									</span>
								</div>
								<div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-emerald-400 backdrop-blur-md shadow-inner">
									<FiTrendingUp size={32} />
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}

export default memo(DashboardStats);
