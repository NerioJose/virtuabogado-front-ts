'use client';

import { useState, useEffect, useMemo } from 'react';
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
	FiX
} from 'react-icons/fi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrdersByLawyer } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import CasosAbogadoPanel from './CasosAbogadoPanel';
import AgendaPanel from './AgendaPanel';
import MensajesPanel from './MensajesPanel';
import ClientesAbogadoPanel from './ClientesAbogadoPanel';
import FacturacionPanel from './FacturacionPanel';
import DocumentosPanel from './DocumentosPanel';
import PerfilAbogadoPanel from './PerfilAbogadoPanel';
import { formatCurrency } from '@/utils/formatters';
import { OrdersHistoryTable } from '@/features/orders/components/OrdersHistoryTable';
import { useQuery } from '@tanstack/react-query';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';

interface AbogadoPanelProps {
	abogadoId?: string;
}

export default function AbogadoPanel({ abogadoId }: AbogadoPanelProps) {
	const router = useRouter();
	const [seccionActiva, setSeccionActiva] = useState('casos');
	const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
	const [selectedCasoId, setSelectedCasoId] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

	const { user: userAuth, logout: storeLogout } = useAuthStore();
	const currentAbogadoId = abogadoId || userAuth?.id || ''; 

	const { data: orders = [], isLoading: isLoadingOrders } = useOrdersByLawyer(currentAbogadoId);

	// Fetch unified financial summary for KPIs
	const { data: summary, isLoading: isLoadingSummary } = useQuery({
		queryKey: ['financial-summary', currentAbogadoId],
		queryFn: () => getFinancialSummary({ lawyerId: currentAbogadoId }, { id: userAuth?.id || '', rol: 'ABOGADO' }),
		enabled: !!userAuth?.id
	});

	// Manejador de cierre de sesión
	const handleLogout = async () => {
		try {
			storeLogout();
			router.push('/login');
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	};

	// Calcular estadísticas en tiempo real
	const estadisticas = useMemo(() => {
		const uniqueClients = new Set();
		orders.forEach((order: any) => {
			if (order.userId) uniqueClients.add(order.userId);
		});

		return {
			casosActivos: orders.filter((o: any) => o.status === OrderStatus.EN_PROGRESO).length,
			casosPendientes: orders.filter((o: any) => o.status === OrderStatus.PENDIENTE).length,
			casosCompletados: orders.filter((o: any) => o.status === OrderStatus.COMPLETADO).length,
			clientesActivos: uniqueClients.size,
			proximaCita: new Date().toISOString(), // Mock por ahora
			ingresosMes: summary?.lawyerPendingBalance || 0, // Server-verified balance
		};
	}, [orders, summary]);

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

	if (loading || isLoadingOrders) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-gray-100">
			{/* Sidebar - Overlay for mobile */}
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
				<div className="p-6 border-b border-gray-200 flex justify-between items-center">
					<div>
						<h2 className="text-xl font-bold text-azul-primario">
							Panel Abogado
						</h2>
						<p className="text-sm text-gray-600 mt-1">{abogado?.nombre || 'Cargando...'}</p>
					</div>
					<button 
						onClick={() => setIsSidebarOpen(false)}
						className="lg:hidden p-2 text-gray-400 hover:text-azul-primario transition-colors"
					>
						<FiX size={20} />
					</button>
				</div>

				<nav className="mt-6 overflow-y-auto max-h-[calc(100vh-120px)]">
					<ul>
						<li>
							<button
								onClick={() => { handleNavClick('casos'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-6 py-3 text-left ${seccionActiva === 'casos'
									? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario'
									: 'text-gray-600 hover:bg-gray-100'
									}`}>
								<FiBriefcase className="mr-3" />
								<span>Mis Casos</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('agenda'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-6 py-3 text-left ${seccionActiva === 'agenda'
									? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario'
									: 'text-gray-600 hover:bg-gray-100'
									}`}>
								<FiCalendar className="mr-3" />
								<span>Agenda</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('mensajes'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-6 py-3 text-left ${seccionActiva === 'mensajes'
									? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario'
									: 'text-gray-600 hover:bg-gray-100'
									}`}>
								<FiMessageSquare className="mr-3" />
								<span>Mensajes</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('clientes'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-6 py-3 text-left ${seccionActiva === 'clientes'
									? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario'
									: 'text-gray-600 hover:bg-gray-100'
									}`}>
								<FiUser className="mr-3" />
								<span>Mis Clientes</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('facturacion'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-6 py-3 text-left ${seccionActiva === 'facturacion'
									? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario'
									: 'text-gray-600 hover:bg-gray-100'
									}`}>
								<FiDollarSign className="mr-3" />
								<span>Facturación</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('documentos'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-6 py-3 text-left ${seccionActiva === 'documentos'
									? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario'
									: 'text-gray-600 hover:bg-gray-100'
									}`}>
								<FiFileText className="mr-3" />
								<span>Documentos</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('perfil'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-6 py-3 text-left ${seccionActiva === 'perfil'
									? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario'
									: 'text-gray-600 hover:bg-gray-100'
									}`}>
								<FiUser className="mr-3" />
								<span>Mi Perfil</span>
							</button>
						</li>
						<li>
							<button
								onClick={() => { handleNavClick('historial'); setIsSidebarOpen(false); }}
								className={`w-full flex items-center px-6 py-3 text-left ${seccionActiva === 'historial'
									? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario'
									: 'text-gray-600 hover:bg-gray-100'
									}`}>
								<FiClock className="mr-3" />
								<span>Historial</span>
							</button>
						</li>
						<li className="mt-6 border-t border-gray-200 pt-4">
							<button
								onClick={handleLogout}
								className="w-full flex items-center px-6 py-3 text-left text-red-600 hover:bg-red-50">
								<FiLogOut className="mr-3" />
								<span>Cerrar Sesión</span>
							</button>
						</li>
					</ul>
				</nav>
			</div>

			{/* Contenido principal */}
			<div className="lg:ml-64 flex-1 p-4 md:p-6 transition-all duration-300">
				{/* Móvil: botón para abrir Sidebar */}
				<button 
					onClick={() => setIsSidebarOpen(true)}
					className="lg:hidden mb-4 p-2 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center gap-2 text-azul-primario"
				>
					<FiMenu />
					<span className="text-sm font-semibold">Menú</span>
				</button>
				{/* Tarjetas de estadísticas */}
				{seccionActiva === 'casos' && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3 }}
							className="bg-white rounded-xl shadow-md p-6">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-gray-500 text-sm">Casos Activos</p>
									<h3 className="text-3xl font-bold text-azul-primario mt-2">
										{estadisticas.casosActivos}
									</h3>
								</div>
								<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
									<FiBriefcase size={24} />
								</div>
							</div>
							<div className="mt-4 flex items-center text-amber-500 text-sm">
								<FiClock className="mr-1" />
								<span>
									{estadisticas.casosPendientes} pendientes de revisión
								</span>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0.1 }}
							className="bg-white rounded-xl shadow-md p-6">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-gray-500 text-sm">Próxima Cita</p>
									<h3 className="text-xl font-bold text-azul-primario mt-2">
										{new Date(estadisticas.proximaCita).toLocaleDateString(
											'es-ES',
											{
												day: '2-digit',
												month: '2-digit',
												hour: '2-digit',
												minute: '2-digit',
											}
										)}
									</h3>
								</div>
								<div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
									<FiCalendar size={24} />
								</div>
							</div>
							<div className="mt-4 flex items-center text-gray-500 text-sm">
								<FiUser className="mr-1" />
								<span>{estadisticas.clientesActivos} clientes activos</span>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.3, delay: 0 }}
							className="bg-white rounded-xl shadow-md p-6">
							<div className="flex justify-between items-start">
								<div>
									<p className="text-gray-500 text-sm">Ingresos del Mes</p>
									<h3 className="text-3xl font-bold text-azul-primario mt-2">
										{formatCurrency(estadisticas.ingresosMes)}
									</h3>
								</div>
								<div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
									<FiDollarSign size={24} />
								</div>
							</div>
							<div className="mt-4 flex items-center text-green-500 text-sm">
								<FiCheckCircle className="mr-1" />
								<span>{estadisticas.casosCompletados} casos completados</span>
							</div>
						</motion.div>
					</div>
				)}

				{/* Contenido dinámico según la sección activa */}
				<div className="bg-white rounded-xl shadow-md p-6">
					{abogado ? (
						<>
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
								<div className="py-2">
									<h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
										<FiClock className="text-azul-primario" />
										Historial de Casos Asignados
									</h2>
									<OrdersHistoryTable user={{ id: currentAbogadoId, rol: 'ABOGADO' }} />
								</div>
							)}
						</>
					) : (
						<div className="flex justify-center items-center h-64">
							<div className="text-center">
								<div className="w-16 h-16 border-4 border-azul-primario border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
								<p className="text-azul-primario font-medium">Cargando datos del abogado...</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
