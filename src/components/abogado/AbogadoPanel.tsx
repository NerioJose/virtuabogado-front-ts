'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PushNotificationToggle from '@/components/notifications/PushNotificationToggle';
import { Abogado } from '@/types/index';
import {
	FiBriefcase,
	FiCalendar,
	FiClock,
	FiMessageSquare,
	FiUser,
	FiDollarSign,
	FiCheckCircle,
	FiFileText,
	FiLogOut,
	FiMenu,
	FiX,
	FiLoader
} from 'react-icons/fi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { UserRole } from '@/shared/types/entities.types';
import { formatCurrency } from '@/utils/formatters';
import { useQuery } from '@tanstack/react-query';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useAbogadoPanel } from './hooks/useAbogadoPanel';

// OPTIMIZACIÓN (Dynamic Imports): Cargamos solo lo crítico (Casos) y el resto bajo demanda
const CasosAbogadoPanel = dynamic(() => import('./CasosAbogadoPanel'), { 
    loading: () => <div className="p-8 flex justify-center"><FiLoader className="animate-spin text-azul-primario" size={32} /></div>,
    ssr: false 
});
const AgendaPanel = dynamic(() => import('./AgendaPanel'), { ssr: false });
const MensajesPanel = dynamic(() => import('./MensajesPanel'), { ssr: false });
const ClientesAbogadoPanel = dynamic(() => import('./ClientesAbogadoPanel'), { ssr: false });
const FacturacionPanel = dynamic(() => import('./FacturacionPanel'), { ssr: false });
const DocumentosPanel = dynamic(() => import('./DocumentosPanel'), { ssr: false });
const PerfilAbogadoPanel = dynamic(() => import('./PerfilAbogadoPanel'), { ssr: false });
const OrdersHistoryTable = dynamic(() => import('@/features/orders/components/OrdersHistoryTable').then(mod => mod.OrdersHistoryTable), { ssr: false });

interface AbogadoPanelProps {
	abogadoId?: string;
}

export default function AbogadoPanel({ abogadoId }: AbogadoPanelProps) {
	const {
		seccionActiva,
		setSeccionActiva,
		selectedClienteId,
		setSelectedClienteId,
		selectedCasoId,
		setSelectedCasoId,
		isSidebarOpen,
		setIsSidebarOpen,
		abogado,
		loading,
		estadisticas,
		handleNavClick,
		handleVerDetallesCaso,
		handleLogout,
		currentAbogadoId,
	} = useAbogadoPanel(abogadoId);

	// 🔥 REALTIME REACTIVITY: Escuchar cambios en órdenes y mensajes
	// Esto invalida la caché de TanStack Query instantáneamente
	useRealtimeSubscription();

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<FiLoader className="animate-spin text-azul-primario" size={40} />
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-gray-100 max-w-[100vw] overflow-x-hidden">
			{/* Sidebar responsivo con overlay */}
			{isSidebarOpen && (
				<motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
					className="fixed inset-0 bg-slate-900/60 z-[60] lg:hidden backdrop-blur-sm"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			<motion.div 
                className={`
                    w-72 bg-white shadow-2xl fixed h-full z-[70] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
				<div className="p-6 border-b border-gray-100 flex justify-between items-center bg-azul-primario/[0.02]">
					<Link href="/" className="group/logo">
						<h2 className="text-xl font-black text-azul-primario tracking-tight flex items-center gap-2 group-hover/logo:scale-105 transition-transform">
							<div className="w-8 h-8 bg-azul-primario rounded-lg flex items-center justify-center text-white">
                                <FiBriefcase size={18} />
                            </div>
                            VirtuAbogado
						</h2>
						<p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">Panel de Gestión</p>
					</Link>
					<button 
						onClick={() => setIsSidebarOpen(false)}
						className="lg:hidden p-2 text-slate-400 hover:text-red-500 transition-colors"
					>
						<FiX size={24} />
					</button>
				</div>

				<nav className="mt-6 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
					<ul className="px-4 space-y-1.5">
						{[
							{ id: 'casos', label: 'Mis Casos', icon: <FiBriefcase /> },
							{ id: 'agenda', label: 'Agenda', icon: <FiCalendar /> },
							{ id: 'mensajes', label: 'Mensajes', icon: <FiMessageSquare /> },
							{ id: 'clientes', label: 'Mis Clientes', icon: <FiUser /> },
							{ id: 'facturacion', label: 'Facturación', icon: <FiDollarSign /> },
							{ id: 'documentos', label: 'Documentos', icon: <FiFileText /> },
							{ id: 'perfil', label: 'Mi Perfil', icon: <FiUser />, divider: true },
							{ id: 'historial', label: 'Historial', icon: <FiClock /> },
						].map((item) => (
							<li key={item.id} className={item.divider ? 'pt-4 mt-4 border-t border-slate-100' : ''}>
								<button
									onClick={() => { handleNavClick(item.id); setIsSidebarOpen(false); }}
									className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition-all duration-200 group ${seccionActiva === item.id
										? 'bg-azul-primario text-white shadow-lg shadow-azul-primario/25 translate-x-2'
										: 'text-slate-500 hover:bg-slate-50 hover:text-azul-primario'
										}`}>
                                    <span className={`text-lg mr-3 transition-transform group-hover:scale-110 ${seccionActiva === item.id ? 'text-white' : 'text-slate-400'}`}>
                                        {item.icon}
                                    </span>
									<span className="font-bold text-sm">{item.label}</span>
								</button>
							</li>
						))}
						
						<li className="mt-8 px-4">
							<PushNotificationToggle />
						</li>
						
						<li className="mt-4 mb-6">
							<button
								onClick={handleLogout}
								className="w-full flex items-center px-4 py-4 text-red-500 hover:bg-red-50 rounded-2xl transition-all group font-black text-sm">
								<FiLogOut className="mr-3 group-hover:-translate-x-1 transition-transform text-lg" />
								<span>Cerrar Sesión</span>
							</button>
						</li>
					</ul>
				</nav>
			</motion.div>

			{/* Main Content Area */}
			<div className="lg:ml-72 flex-1 min-h-screen flex flex-col transition-all duration-500 bg-slate-50/50 overflow-x-hidden w-full max-w-full">
				{/* Móvil Header / Top Bar */}
				<header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 lg:hidden px-4 h-16 flex items-center justify-between">
					<button 
						onClick={() => setIsSidebarOpen(true)}
						className="p-2.5 bg-azul-primario/5 text-azul-primario rounded-xl active:scale-90 transition-all"
					>
                        <FiMenu size={24} />
					</button>
                    <div className="text-sm font-black text-azul-primario uppercase tracking-tighter">
                        Dashboard
                    </div>
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 overflow-hidden border-2 border-white shadow-sm">
                        {abogado?.picture ? (
                            <img src={abogado.picture} alt={abogado.nombre} className="w-full h-full object-cover" />
                        ) : (
                            <FiUser size={20} />
                        )}
                    </div>
				</header>

				<main className="flex-1 px-4 py-4 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
					{/* Welcome Header (Desktop) */}
					<header className="hidden lg:flex justify-between items-center mb-10">
						<div>
							<h1 className="text-3xl font-black text-slate-900 tracking-tight">
								Hola, <span className="text-azul-primario">{abogado?.nombre.split(' ')[0]}</span> 👋
							</h1>
							<p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">
								Panel de gestión especializado
							</p>
						</div>
						<div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-900">{abogado?.nombre}</p>
                                <p className="text-xs font-bold text-azul-primario">{abogado?.especialidad}</p>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-azul-primario overflow-hidden">
                                {abogado?.picture ? (
                                    <img src={abogado.picture} alt={abogado.nombre} className="w-full h-full object-cover" />
                                ) : (
                                    <FiUser size={24} />
                                )}
                            </div>
                        </div>
					</header>

					{/* Dashboard Stats */}
					{seccionActiva === 'casos' && (
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10">
							<motion.div
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <FiBriefcase size={80} />
                                </div>
								<div className="flex justify-between items-start relative z-10">
									<div>
										<p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Casos Activos</p>
										<h3 className="text-4xl font-black text-slate-900 mt-1">
											{estadisticas.casosActivos}
										</h3>
									</div>
									<div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform shadow-inner">
										<FiBriefcase size={22} />
									</div>
								</div>
								<div className="mt-6 flex items-center text-amber-600 font-black text-[10px] bg-amber-50 rounded-xl px-3 py-1.5 w-fit uppercase tracking-wider">
									<FiClock className="mr-1.5" />
									<span>{estadisticas.casosPendientes} pendientes</span>
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.1 }}
								className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:shadow-purple-500/5 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <FiCalendar size={80} />
                                </div>
								<div className="flex justify-between items-start relative z-10">
									<div>
										<p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Próxima Acceso</p>
										<h3 className="text-xl font-black text-slate-900 mt-2">
											{new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
										</h3>
									</div>
									<div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform shadow-inner">
										<FiCalendar size={22} />
									</div>
								</div>
								<div className="mt-6 flex items-center text-purple-600 font-black text-[10px] bg-purple-50 rounded-xl px-3 py-1.5 w-fit uppercase tracking-wider">
									<FiUser className="mr-1.5" />
									<span>{estadisticas.clientesActivos} Clientes</span>
								</div>
							</motion.div>

							<motion.div
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all group relative overflow-hidden sm:col-span-2 lg:col-span-1">
                                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <FiDollarSign size={80} />
                                </div>
								<div className="flex justify-between items-start relative z-10">
									<div>
										<p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Honorarios Pendientes</p>
										<h3 className="text-3xl font-black text-slate-900 mt-1">
											{formatCurrency(estadisticas.ingresosMes)}
										</h3>
									</div>
									<div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform shadow-inner">
										<FiDollarSign size={22} />
									</div>
								</div>
								<div className="mt-6 flex items-center text-emerald-600 font-black text-[10px] bg-emerald-50 rounded-xl px-3 py-1.5 w-fit uppercase tracking-wider">
									<FiCheckCircle className="mr-1.5" />
									<span>{estadisticas.casosCompletados} finalizados</span>
								</div>
							</motion.div>
						</div>
					)}

					{/* DYNAMIC CONTENT AREA */}
					<div className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-sm border border-slate-100 p-3 md:p-8 min-h-[600px] relative overflow-hidden max-w-full">
						{abogado ? (
							<Suspense fallback={<div className="flex justify-center p-20"><FiLoader className="animate-spin text-azul-primario" size={40} /></div>}>
							{seccionActiva === 'casos' && (
								<CasosAbogadoPanel 
									abogadoId={abogado.id} 
									initialClienteId={selectedClienteId} 
									initialCasoId={selectedCasoId}
								/>
							)}
							{seccionActiva === 'agenda' && (
								<AgendaPanel 
									abogadoId={abogado.id} 
									onVerDetalles={handleVerDetallesCaso}
								/>
							)}
							{seccionActiva === 'mensajes' && (
								<MensajesPanel abogadoId={abogado.id} initialClienteId={selectedClienteId} />
							)}
							{seccionActiva === 'clientes' && (
								<ClientesAbogadoPanel 
                                    abogadoId={abogado.id} 
                                    onNavigateToCasos={(id: string) => { setSelectedClienteId(id); setSeccionActiva('casos'); }}
                                    onNavigateToMensajes={(id: string) => { setSelectedClienteId(id); setSeccionActiva('mensajes'); }}
                                />
							)}
							{seccionActiva === 'facturacion' && (
								<FacturacionPanel abogadoId={abogado.id} />
							)}
							{seccionActiva === 'documentos' && (
								<DocumentosPanel abogadoId={abogado.id} />
							)}
							{seccionActiva === 'perfil' && (
								<PerfilAbogadoPanel abogado={abogado} />
							)}
							{seccionActiva === 'historial' && (
								<div className="py-4">
									<h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
										<div className="w-10 h-10 bg-azul-primario/10 rounded-xl flex items-center justify-center">
                                            <FiClock className="text-azul-primario" />
                                        </div>
										Historial de Gestión
									</h2>
									<OrdersHistoryTable user={{ id: currentAbogadoId, rol: UserRole.ABOGADO }} />
								</div>
							)}
						</Suspense>
					) : (
						<div className="flex justify-center items-center h-64 text-azul-primario">
							<FiLoader className="animate-spin" size={48} />
						</div>
					)}
				</div>
			</main>
		</div>
	</div>
);
}
