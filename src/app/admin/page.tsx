'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import {
	FiUsers,
	FiUserCheck,
	FiBriefcase,
	FiDollarSign,
	FiPieChart,
	FiSettings,
	FiSearch,
	FiPlus,
} from 'react-icons/fi';
import { useAuthStore } from '@/features/auth/store/authStore';

// Importar componentes principales
import Sidebar from '@/components/admin/Sidebar';
import DashboardStats from '@/components/admin/DashboardStats';

// Lazy loading para componentes pesados
const RecentOrders = lazy(() => import('@/components/admin/RecentOrders'));
const AbogadosPanel = lazy(() => import('@/components/admin/AbogadosPanel'));
const ClientesPanel = lazy(() => import('@/components/admin/ClientesPanel'));
const CasosPanel = lazy(() => import('@/components/admin/CasosPanel'));
const FinanzasPanel = lazy(() => import('@/components/admin/FinanzasPanel'));
const EstadisticasPanel = lazy(
	() => import('@/components/admin/EstadisticasPanel')
);
const ConfiguracionPanel = lazy(
	() => import('@/components/admin/ConfiguracionPanel')
);
const ModalContainer = lazy(() => import('@/components/admin/ModalContainer'));

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
	const { user, isAuthenticated, checkAuth } = useAuthStore();
	const [seccionActiva, setSeccionActiva] = useState<SeccionAdmin>('dashboard');
	const [modalAbierto, setModalAbierto] = useState(false);
	const [tipoModal, setTipoModal] = useState<
		'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar'
	>('ver');
	const [elementoSeleccionado, setElementoSeleccionado] =
		useState<ElementoSeleccionable>(null);
	const [terminoBusqueda, setTerminoBusqueda] = useState('');

	// Verificar autenticación y rol de administrador
	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	useEffect(() => {
		if (!isAuthenticated && user === null) {
			// Solo redirigir si definitivamente no está autenticado
			router.push('/login');
		} else if (user && user.rol !== 'admin') {
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

	// Manejador de cierre de sesión
	const handleLogout = async () => {
		try {
			// Eliminar los datos del usuario del localStorage
			localStorage.removeItem('user');

			// Redirigir al usuario a la página de login
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
		return !['dashboard', 'configuracion', 'estadisticas'].includes(seccion);
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
							<RecentOrders />
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
		<div className="flex min-h-screen bg-gray-100">
			{/* Sidebar */}
			<Sidebar
				seccionActiva={seccionActiva}
				setSeccionActiva={setSeccionActiva}
				handleLogout={handleLogout}
			/>

			{/* Contenido principal */}
			<div className="flex-1 ml-64">
				{/* Barra superior */}
				<div className="bg-white shadow-sm p-4 flex justify-between items-center">
					<h1 className="text-2xl font-bold text-azul-primario flex items-center">
						{getSeccionIcon(seccionActiva)}
						{getSeccionTitulo(seccionActiva)}
					</h1>

					<div className="flex items-center space-x-4">
						{allowsSearch(seccionActiva) && (
							<div className="relative">
								<FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
								<input
									type="text"
									placeholder="Buscar..."
									value={terminoBusqueda}
									onChange={(e) => setTerminoBusqueda(e.target.value)}
									className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario"
									aria-label="Buscar elementos"
								/>
							</div>
						)}

						{allowsCreate(seccionActiva) && (
							<button
								onClick={() => abrirModal('crear')}
								className="flex items-center space-x-2 bg-azul-primario text-white px-4 py-2 rounded-lg hover:bg-azul-primario/90 transition-colors focus:outline-none focus:ring-2 focus:ring-azul-primario focus:ring-offset-2"
								aria-label={`Crear nuevo ${getNuevoButtonText(seccionActiva)}`}>
								<FiPlus size={16} />
								<span>Nuevo {getNuevoButtonText(seccionActiva)}</span>
							</button>
						)}
					</div>
				</div>

				{/* Contenido dinámico según la sección activa */}
				<div className="p-6">{renderSeccionContent()}</div>
			</div>

			{/* Modal dinámico */}
			{modalAbierto && (
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
						elemento={elementoSeleccionado}
						onClose={cerrarModal}
					/>
				</Suspense>
			)}
		</div>
	);
}
