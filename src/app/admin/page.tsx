'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { FiUsers, FiUserCheck, FiBriefcase, FiDollarSign, FiPieChart, FiSettings, FiSearch, FiPlus, FiMenu, FiX, FiClock, FiCreditCard } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/store/authStore';
import { UserRole } from '@/shared/types/entities.types';
// import { initializeOrders } from '@/features/orders';
import { useUpdateOrder, useDeleteOrder, useCreateOrderByAdmin } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
// import { initializeClients, useClientsStore } from '@/features/clients';
// import { initializeLawyers, useLawyersStore } from '@/features/lawyers';
import { useDeleteClient, useUpdateClient, useCreateClient } from '@/features/clients/hooks/useClients';
import { useDeleteLawyer, useUpdateLawyer, useCreateLawyer } from '@/features/lawyers/hooks/useLawyers';

// Importar componentes principales
import Sidebar from '@/components/admin/Sidebar';
import DashboardStats from '@/components/admin/DashboardStats';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

// Lazy loading para componentes pesados
const RecentOrders = lazy(() => import('@/components/admin/RecentOrders'));
const AbogadosPanel = lazy(() => import('@/features/lawyers/components/AbogadosPanel'));
const ClientesPanel = lazy(() => import('@/features/clients/components/ClientesPanel'));
const CasosPanel = lazy(() => import('@/components/admin/CasosPanel'));
const FinanzasPanel = lazy(() => import('@/components/admin/FinanzasPanel'));
const EstadisticasPanel = lazy(
	() => import('@/components/admin/EstadisticasPanel')
);
const ConfiguracionPanel = lazy(
	() => import('@/components/admin/ConfiguracionPanel')
);
const ModalContainer = lazy(() => import('@/components/admin/ModalContainer'));
const MetodosPagoPanel = lazy(() => import('@/components/admin/MetodosPagoPanel'));
import { OrdersHistoryTable } from '@/features/orders/components/OrdersHistoryTable';

// Importar tipos
import { ElementoSeleccionable, SeccionAdmin } from '@/types/index';

// Componente de Loading reutilizable
const LoadingSpinner = ({
	size = 'normal',
	text = 'Cargando...',
}: {
	size?: 'small' | 'normal';
	text?: string;
}) => (
	<div className="flex justify-center items-center h-64">
		<div className="text-center">
			<div
				className={`border-4 border-azul-primario border-t-transparent rounded-full animate-spin mx-auto mb-4 ${size === 'small' ? 'w-8 h-8' : 'w-16 h-16'
					}`}></div>
			<p className="text-azul-primario font-medium">{text}</p>
		</div>
	</div>
);

export default function AdminPage() {
	const router = useRouter();
	const { user, isAuthenticated, checkAuth, logout: storeLogout } = useAuthStore();
	const [seccionActiva, setSeccionActiva] = useState<SeccionAdmin>('dashboard');
	const [modalAbierto, setModalAbierto] = useState(false);
	const [tipoModal, setTipoModal] = useState<
		'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar'
	>('ver');
	const [elementoSeleccionado, setElementoSeleccionado] =
		useState<ElementoSeleccionable>(null);
	const [terminoBusqueda, setTerminoBusqueda] = useState('');
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	// Verificar autenticación y rol de administrador
	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	// Inicializar datos del dashboard
	useEffect(() => {
		if (isAuthenticated && user?.rol === UserRole.ADMIN) {
			
			// initializeOrders(); -- Legacy removed, using React Query
			// React Query handles clients and lawyers automatically
		}
	}, [isAuthenticated, user]);

	useEffect(() => {
		if (!isAuthenticated && user === null) {
			// Solo redirigir si definitivamente no está autenticado
			router.push('/login');
		} else if (user && user.rol !== UserRole.ADMIN) {
			console.error('No autorizado');
			router.push('/login');
		}
	}, [isAuthenticated, user, router]);

	// Funciones para modales
	const abrirModal = (
		tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar',
		elemento?: ElementoSeleccionable
	) => {
		setTipoModal(tipo);
		setElementoSeleccionado(elemento || null);
		setModalAbierto(true);
	};

	const cerrarModal = () => {
		setModalAbierto(false);
		setElementoSeleccionado(null);
	};

	// ============ REACT QUERY MUTATIONS ============
	const deleteClientMutation = useDeleteClient();
	const updateClientMutation = useUpdateClient();
	const createClientMutation = useCreateClient();
	const deleteLawyerMutation = useDeleteLawyer();
	const updateLawyerMutation = useUpdateLawyer();
	const createLawyerMutation = useCreateLawyer();
	const updateOrderMutation = useUpdateOrder();
	const deleteOrderMutation = useDeleteOrder();
	const createOrderByAdminMutation = useCreateOrderByAdmin();

	// Manejador para guardar o eliminar datos desde el modal
	const handleSave = async (data: any) => {
		try {
			const id = elementoSeleccionado?.id;
			

			switch (seccionActiva) {
				case 'clientes':
					if (tipoModal === 'eliminar' && id) {
						await deleteClientMutation.mutateAsync(id);
					} else if (tipoModal === 'editar' && id) {
						await updateClientMutation.mutateAsync({ id, data });
					} else if (tipoModal === 'crear') {
						await createClientMutation.mutateAsync(data);
					}
					break;

				case 'abogados':
					if (tipoModal === 'eliminar' && id) {
						await deleteLawyerMutation.mutateAsync(id);
					} else if (tipoModal === 'editar' && id) {
						await updateLawyerMutation.mutateAsync({ id, data });
					} else if (tipoModal === 'crear') {
						await createLawyerMutation.mutateAsync(data);
					}
					break;

				case 'casos':
				case 'finanzas': // Both use updateOrderMutation
					if (tipoModal === 'eliminar' && id) {
						await deleteOrderMutation.mutateAsync(id);
					} else if (tipoModal === 'editar' && id) {
						// Usar la mutación de React Query para actualizar estado
						await updateOrderMutation.mutateAsync({
							id,
							data: { status: data.status }
						});
					} else if (tipoModal === 'crear') {
						await createOrderByAdminMutation.mutateAsync(data);
					} else if (tipoModal === 'asignar' && id) {
						// Usar la mutación de React Query para asignar abogado
						// Actualizamos también el estado a "EN_PROGRESO" (PROCESSING)
						await updateOrderMutation.mutateAsync({
							id,
							data: {
								lawyerId: data.lawyerId,
								status: OrderStatus.EN_PROGRESO,
								assignedAt: new Date().toISOString()
							}
						});
					}
					break;

				default:
					console.warn('Acción no implementada para la sección:', seccionActiva);
			}
		} catch (error) {
			console.error('Error al procesar acción en admin:', error);
			throw error;
		}
	};

	// Manejador de cierre de sesión
	const handleLogout = async () => {
		try {
			storeLogout();
			router.push('/login');
		} catch (error) {
			console.error('Error al cerrar sesión:', error);
		}
	};

	// Función para obtener el icono según la sección
	const getSeccionIcon = (seccion: SeccionAdmin) => {
		const iconProps = { className: 'mr-2', size: 20 };

		switch (seccion) {
			case 'dashboard':
				return <FiPieChart {...iconProps} />;
			case 'abogados':
				return <FiUserCheck {...iconProps} />;
			case 'clientes':
				return <FiUsers {...iconProps} />;
			case 'casos':
				return <FiBriefcase {...iconProps} />;
			case 'finanzas':
				return <FiDollarSign {...iconProps} />;
			case 'estadisticas':
				return <FiPieChart {...iconProps} />;
			case 'configuracion':
				return <FiSettings {...iconProps} />;
			case 'historial':
				return <FiClock {...iconProps} />;
			case 'pasarelas':
				return <FiCreditCard {...iconProps} />;
			default:
				return null;
		}
	};

	// Función para obtener el título según la sección
	const getSeccionTitulo = (seccion: SeccionAdmin): string => {
		const titulos: Record<SeccionAdmin, string> = {
			dashboard: 'Panel Principal',
			abogados: 'Gestión de Abogados',
			clientes: 'Gestión de Clientes',
			casos: 'Gestión de Casos',
			finanzas: 'Gestión Financiera',
			estadisticas: 'Estadísticas y Reportes',
			configuracion: 'Configuración',
			pasarelas: 'Pasarelas de Pago',
			historial: 'Historial de Casos',
		};

		return titulos[seccion] || 'Panel de Administración';
	};

	// Función para obtener el texto del botón "Nuevo"
	const getNuevoButtonText = (seccion: SeccionAdmin): string => {
		const textos: Record<string, string> = {
			abogados: 'Abogado',
			casos: 'Caso',
			clientes: 'Cliente',
		};

		return textos[seccion] || 'Elemento';
	};

	// Verificar si la sección permite búsqueda
	const allowsSearch = (seccion: SeccionAdmin): boolean => {
		return !['dashboard', 'configuracion', 'estadisticas', 'historial'].includes(seccion);
	};

	// Verificar si la sección permite crear nuevos elementos
	const allowsCreate = (seccion: SeccionAdmin): boolean => {
		return ['abogados', 'casos', 'clientes'].includes(seccion);
	};

	// Renderizar contenido de la sección
	const renderSeccionContent = () => {
		const fallback = (
			<LoadingSpinner
				size="small"
				text="Cargando contenido..."
			/>
		);

		switch (seccionActiva) {
			case 'dashboard':
				return (
					<>
						<DashboardStats />
						<Suspense
							fallback={<LoadingSpinner text="Cargando órdenes..." />}>
							<RecentOrders 
								abrirModal={abrirModal} 
								onVerTodas={() => setSeccionActiva('casos')}
							/>
						</Suspense>
					</>
				);
			case 'abogados':
				return (
					<Suspense fallback={fallback}>
						<AbogadosPanel
							terminoBusqueda={terminoBusqueda}
							abrirModal={abrirModal}
						/>
					</Suspense>
				);
			case 'clientes':
				return (
					<Suspense fallback={fallback}>
						<ClientesPanel
							terminoBusqueda={terminoBusqueda}
							abrirModal={abrirModal}
						/>
					</Suspense>
				);
			case 'casos':
				return (
					<Suspense fallback={fallback}>
						<CasosPanel
							terminoBusqueda={terminoBusqueda}
							abrirModal={abrirModal}
						/>
					</Suspense>
				);
			case 'finanzas':
				return (
					<Suspense fallback={fallback}>
						<FinanzasPanel
							terminoBusqueda={terminoBusqueda}
							abrirModal={abrirModal}
						/>
					</Suspense>
				);
			case 'estadisticas':
				return (
					<Suspense fallback={fallback}>
						<EstadisticasPanel />
					</Suspense>
				);
			case 'configuracion':
				return (
					<Suspense fallback={fallback}>
						<ConfiguracionPanel />
					</Suspense>
				);
			case 'pasarelas':
				return (
					<Suspense fallback={fallback}>
						<MetodosPagoPanel />
					</Suspense>
				);
			case 'historial':
				return (
					<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
						<div className="p-6">
							<OrdersHistoryTable user={{ id: user!.id, rol: user!.rol as any }} />
						</div>
					</div>
				);
			default:
				return (
					<div className="text-center text-gray-500">Sección no encontrada</div>
				);
		}
	};

	if (!isAuthenticated || !user) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-100">
				<LoadingSpinner text="Verificando permisos..." />
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-slate-50/50">
			{/* Sidebar */}
			<Sidebar
				seccionActiva={seccionActiva}
				setSeccionActiva={(s) => {
					setSeccionActiva(s);
					setIsSidebarOpen(false);
				}}
				handleLogout={handleLogout}
				isOpen={isSidebarOpen}
				onClose={() => setIsSidebarOpen(false)}
			/>

			{/* Contenido principal */}
			<div className={`flex-1 min-w-0 transition duration-500 ease-in-out lg:ml-72`}>
				{/* Barra superior Premium */}
				<header className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 px-4 py-4 md:px-8 flex justify-between items-center shadow-sm">
					<div className="flex items-center gap-4">
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setIsSidebarOpen(true)}
							className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-600 bg-slate-100/50 hover:bg-slate-100 rounded-xl transition"
						>
							<FiMenu size={24} />
						</motion.button>
						<div className="flex flex-col">
							<h1 className="text-lg md:text-xl font-black text-azul-primario flex items-center leading-none">
								<span className="p-2 bg-azul-primario/5 rounded-lg mr-2 lg:hidden">
									{getSeccionIcon(seccionActiva)}
								</span>
								<span className="truncate tracking-tight uppercase">{getSeccionTitulo(seccionActiva)}</span>
							</h1>
							<p className="text-[10px] md:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1 hidden md:block">
								VirtuAbogado Admin System
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2 md:gap-4">
						{allowsSearch(seccionActiva) && (
							<div className="relative group hidden sm:block">
								<FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-azul-primario transition-colors" />
								<input
									type="text"
									placeholder="Buscar..."
									value={terminoBusqueda}
									onChange={(e) => setTerminoBusqueda(e.target.value)}
									className="pl-10 pr-4 py-2.5 bg-slate-100/50 border-transparent border focus:border-azul-primario focus:bg-white rounded-[1.2rem] focus:outline-none focus:ring-4 focus:ring-azul-primario/5 text-sm w-40 md:w-72 transition font-medium placeholder:text-slate-400"
								/>
							</div>
						)}

						{allowsCreate(seccionActiva) && (
							<motion.button
								whileHover={{ scale: 1.02, y: -1 }}
								whileTap={{ scale: 0.98 }}
								onClick={() => abrirModal('crear')}
								className="flex items-center justify-center gap-2 bg-azul-primario text-white px-3 py-2.5 md:px-6 md:py-3 rounded-[1.2rem] hover:bg-azul-primario/90 transition focus:outline-none focus:ring-4 focus:ring-azul-primario/20 shadow-lg shadow-azul-primario/20 font-black text-xs md:text-sm uppercase tracking-widest"
							>
								<FiPlus size={20} className="md:size-4" />
								<span className="hidden md:inline">Nuevo {getNuevoButtonText(seccionActiva)}</span>
							</motion.button>
						)}
					</div>
				</header>

				{/* Contenido dinámico con transiciones fluidas */}
				<main className="p-4 md:p-8 lg:p-10 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
					{allowsSearch(seccionActiva) && (
						<div className="mb-6 sm:hidden">
							<div className="relative group">
								<FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-azul-primario transition-colors" />
								<input
									type="text"
									placeholder="Buscar..."
									value={terminoBusqueda}
									onChange={(e) => setTerminoBusqueda(e.target.value)}
									className="pl-10 pr-4 py-3 bg-white border border-slate-200 focus:border-azul-primario rounded-[1rem] focus:outline-none focus:ring-4 focus:ring-azul-primario/5 text-sm w-full transition font-medium"
								/>
							</div>
						</div>
					)}

					<ErrorBoundary>
						<AnimatePresence mode="wait">
							<motion.div
								key={seccionActiva}
								initial={{ opacity: 0, y: 15 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -15 }}
								transition={{ duration: 0.3, ease: "easeOut" }}
							>
								{renderSeccionContent()}
							</motion.div>
						</AnimatePresence>
					</ErrorBoundary>
				</main>
			</div>

			{/* Modal dinámico */}
			{modalAbierto && (
				<ErrorBoundary onReset={() => setModalAbierto(false)}>
				<Suspense
					fallback={
						<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
							<div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
						</div>
					}>
					<ModalContainer
						seccion={
							seccionActiva as
							| 'abogados'
							| 'clientes'
							| 'casos'
							| 'finanzas'
							| 'configuracion'
						}
						tipo={tipoModal}
						elemento={elementoSeleccionado || undefined}
						onClose={cerrarModal}
						onSave={handleSave}
					/>
				</Suspense>
				</ErrorBoundary>
			)}
		</div>
	);
}
