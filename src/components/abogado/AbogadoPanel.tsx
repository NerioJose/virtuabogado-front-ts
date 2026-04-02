'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
	const router = useRouter();
	const [seccionActiva, setSeccionActiva] = useState('casos');
	const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
	const [selectedCasoId, setSelectedCasoId] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const { user: userAuth, logout: storeLogout } = useAuthStore();
	const currentAbogadoId = abogadoId || userAuth?.id || ''; 

	// Fetch de datos optimizado con TanStack Query (Caché global configurado en Providers)
	const { data: response, isLoading: isLoadingOrders } = useOrdersByLawyer(currentAbogadoId);
	const orders = response?.data || [];

	const { data: summary } = useQuery({
		queryKey: ['FinancialSummary', currentAbogadoId],
		queryFn: () => getFinancialSummary({ lawyerId: currentAbogadoId }, { id: userAuth?.id || '', rol: UserRole.ABOGADO }),
		enabled: !!userAuth?.id,
        staleTime: 1000 * 60 * 5, // 5 min para KPIs financieros
	});

	const handleNavClick = (id: string) => {
		setSeccionActiva(id);
		setSelectedClienteId(null);
		setSelectedCasoId(null);
	};

	const handleVerDetallesCaso = (casoId: string) => {
		setSelectedCasoId(casoId);
		setSeccionActiva('casos');
	};

	const [abogado, setAbogado] = useState<Abogado | null>(null);
	const [loading, setLoading] = useState(true);

	// Sincronización de estado local con AuthStore
	useEffect(() => {
		if (userAuth) {
			setAbogado({
				id: userAuth.id,
				nombre: userAuth.nombre || userAuth.email?.split('@')[0] || 'Abogado',
				email: userAuth.email || '',
				telefono: userAuth.telefono || '',
				picture: userAuth.picture || undefined,
				especialidad: userAuth.especialidad || 'General',
				numeroColegiado: userAuth.matricula || 'N/A',
				experienciaAnios: userAuth.experiencia || 0,
				valoracionMedia: 5.0,
			});
			setLoading(false);
		} else {
			setLoading(false);
		}
	}, [userAuth]);

	// Estadísticas memoizadas para evitar re-renders costosos
	const estadisticas = useMemo(() => {
		if (!orders.length) return { casosActivos: 0, casosPendientes: 0, casosCompletados: 0, clientesActivos: 0, proximaCita: new Date().toISOString(), ingresosMes: 0 };
        
        const uniqueClients = new Set();
		orders.forEach((order: any) => {
			if (order.userId) uniqueClients.add(order.userId);
		});

		return {
			casosActivos: orders.filter((o: any) => o.status === OrderStatus.EN_PROGRESO).length,
			casosPendientes: orders.filter((o: any) => o.status === OrderStatus.PENDIENTE).length,
			casosCompletados: orders.filter((o: any) => o.status === OrderStatus.COMPLETADO).length,
			clientesActivos: uniqueClients.size,
			proximaCita: new Date().toISOString(), // Mock
			ingresosMes: summary?.lawyerPendingBalance || 0,
		};
	}, [orders, summary]);

	const handleLogout = async () => {
		storeLogout();
		router.push('/login');
	};

	if (loading || isLoadingOrders) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<FiLoader className="animate-spin text-azul-primario" size={40} />
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-gray-100">
			{/* Sidebar responsivo con overlay */}
			{isSidebarOpen && (
				<div 
					className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}

			<div className={`
				w-64 bg-white shadow-xl fixed h-full z-50 transition-transform duration-300 ease-in-out
				${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
			`}>
				<div className="p-6 border-b border-gray-100 flex justify-between items-center bg-azul-primario/5">
					<div>
						<h2 className="text-xl font-bold text-azul-primario tracking-tight">
							Dashboard
						</h2>
						<p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Estatus: Abogado Verificado</p>
					</div>
					<button 
						onClick={() => setIsSidebarOpen(false)}
						className="lg:hidden p-2 text-gray-400 hover:text-azul-primario transition-colors"
					>
						<FiX size={20} />
					</button>
				</div>

				<nav className="mt-4 overflow-y-auto max-h-[calc(100vh-120px)]">
					<ul className="px-3 space-y-1">
						<li>
							<button
								onClick={() => { handleNavClick('casos'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${seccionActiva === 'casos'
									? 'bg-azul-primario text-white shadow-md shadow-azul-primario/20'
									: 'text-gray-500 hover:bg-gray-100'
									}`}>
								<FiBriefcase className="mr-3" />
								<span className="font-semibold text-sm">Mis Casos</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('agenda'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${seccionActiva === 'agenda'
									? 'bg-azul-primario text-white shadow-md shadow-azul-primario/20'
									: 'text-gray-500 hover:bg-gray-100'
									}`}>
								<FiCalendar className="mr-3" />
								<span className="font-semibold text-sm">Agenda</span>
							</button>
						</li>
                        <li>
							<button
								onClick={() => { handleNavClick('mensajes'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${seccionActiva === 'mensajes'
									? 'bg-azul-primario text-white shadow-md shadow-azul-primario/20'
									: 'text-gray-500 hover:bg-gray-100'
									}`}>
								<FiMessageSquare className="mr-3" />
								<span className="font-semibold text-sm">Mensajes</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('clientes'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${seccionActiva === 'clientes'
									? 'bg-azul-primario text-white shadow-md shadow-azul-primario/20'
									: 'text-gray-500 hover:bg-gray-100'
									}`}>
								<FiUser className="mr-3" />
								<span className="font-semibold text-sm">Mis Clientes</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('facturacion'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${seccionActiva === 'facturacion'
									? 'bg-azul-primario text-white shadow-md shadow-azul-primario/20'
									: 'text-gray-500 hover:bg-gray-100'
									}`}>
								<FiDollarSign className="mr-3" />
								<span className="font-semibold text-sm">Facturación</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('documentos'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${seccionActiva === 'documentos'
									? 'bg-azul-primario text-white shadow-md shadow-azul-primario/20'
									: 'text-gray-500 hover:bg-gray-100'
									}`}>
								<FiFileText className="mr-3" />
								<span className="font-semibold text-sm">Documentos</span>
							</button>
						</li>
						<li className="pt-4 mt-4 border-t border-gray-100">
							<button
								onClick={() => { handleNavClick('perfil'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${seccionActiva === 'perfil'
									? 'bg-azul-primario text-white shadow-md shadow-azul-primario/20'
									: 'text-gray-500 hover:bg-gray-100'
									}`}>
								<FiUser className="mr-3" />
								<span className="font-semibold text-sm">Mi Perfil</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('historial'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-4 py-3 rounded-xl transition-all ${seccionActiva === 'historial'
									? 'bg-azul-primario text-white shadow-md shadow-azul-primario/20'
									: 'text-gray-500 hover:bg-gray-100'
									}`}>
								<FiClock className="mr-3" />
								<span className="font-semibold text-sm">Historial</span>
							</button>
						</li>
						<li className="mt-8">
							<button
								onClick={handleLogout}
								className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all group">
								<FiLogOut className="mr-3 group-hover:-translate-x-1 transition-transform" />
								<span className="font-bold text-sm">Cerrar Sesión</span>
							</button>
						</li>
					</ul>
				</nav>
			</div>

			{/* Main Content Area */}
			<div className="lg:ml-64 flex-1 p-4 md:p-8 transition-all duration-300">
				{/* Móvil Toggle */}
				<button 
					onClick={() => setIsSidebarOpen(true)}
					className="lg:hidden mb-6 p-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 text-azul-primario group active:scale-95 transition-all"
				>
					<div className="bg-azul-primario/10 p-2 rounded-lg">
                        <FiMenu />
                    </div>
					<span className="text-sm font-bold uppercase tracking-wider">Menú de Gestión</span>
				</button>

				{/* Dashboard Stats */}
				{seccionActiva === 'casos' && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
						<motion.div
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all group">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Activos</p>
									<h3 className="text-4xl font-black text-gray-800 mt-1">
										{estadisticas.casosActivos}
									</h3>
								</div>
								<div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
									<FiBriefcase size={22} />
								</div>
							</div>
							<div className="mt-4 flex items-center text-amber-500 font-bold text-[11px] bg-amber-50 rounded-full px-3 py-1 w-fit">
								<FiClock className="mr-1.5" />
								<span>{estadisticas.casosPendientes} por revisar</span>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:shadow-purple-500/5 transition-all group">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Próxima Cita</p>
									<h3 className="text-xl font-black text-gray-800 mt-2">
										Hoy, {new Date(estadisticas.proximaCita).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
									</h3>
								</div>
								<div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
									<FiCalendar size={22} />
								</div>
							</div>
							<div className="mt-4 flex items-center text-gray-500 font-bold text-[11px] bg-gray-50 rounded-full px-3 py-1 w-fit">
								<FiUser className="mr-1.5" />
								<span>{estadisticas.clientesActivos} Clientes</span>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 hover:shadow-xl hover:shadow-green-500/5 transition-all group">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Balance Pendiente</p>
									<h3 className="text-3xl font-black text-gray-800 mt-1">
										{formatCurrency(estadisticas.ingresosMes)}
									</h3>
								</div>
								<div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-500 group-hover:scale-110 transition-transform">
									<FiDollarSign size={22} />
								</div>
							</div>
							<div className="mt-4 flex items-center text-green-500 font-bold text-[11px] bg-green-50 rounded-full px-3 py-1 w-fit">
								<FiCheckCircle className="mr-1.5" />
								<span>{estadisticas.casosCompletados} Exitosos</span>
							</div>
						</motion.div>
					</div>
				)}

				{/* DYNAMIC CONTENT AREA */}
				<div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-50 p-2 md:p-8 min-h-[500px]">
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
                                    onNavigateToCasos={(id) => { setSelectedClienteId(id); setSeccionActiva('casos'); }}
                                    onNavigateToMensajes={(id) => { setSelectedClienteId(id); setSeccionActiva('mensajes'); }}
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
								<div className="py-4 px-2">
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
			</div>
		</div>
	);
}
