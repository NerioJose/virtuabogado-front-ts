import { useState, useEffect, memo, useMemo, useCallback } from 'react';
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
import { useClientsStore, initializeClients } from '@/features/clients';
import { useLawyersStore, initializeLawyers, LawyerStatus } from '@/features/lawyers';
import { useOrdersStore, initializeOrders, OrderStatus } from '@/features/orders';

// Tipos para las estadísticas
interface Stats {
	totalAbogados: number;
	abogadosPendientes: number;
	totalClientes: number;
	casosActivos: number;
	casosPendientes: number;
	casosCompletados: number;
	ingresosMes: number;
	ingresosTotales: number;
	gananciasNetas: number;
	clientesNuevosMes: number;
	crecimientoIngresos: number;
	gastosOperativos: number;
}

// Tipo para actividades
interface Actividad {
	id: string;
	tipo: 'caso' | 'abogado' | 'pago' | 'cliente';
	accion: string;
	detalles: string;
	tiempo: string;
	timestamp: Date;
}

// Componente para el spinner de carga
const LoadingSpinner = () => (
	<div className="flex justify-center items-center h-64">
		<div className="text-center">
			<div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p className="text-gray-500">Cargando estadísticas...</p>
		</div>
	</div>
);

// Componente para tarjetas de estadísticas
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
		<div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-gray-500 text-sm font-medium">{title}</p>
					<p className="text-3xl font-bold text-gray-800 mt-1">
						{typeof value === 'number' &&
							title.toLowerCase().includes('ingreso')
							? `$${value.toLocaleString()}`
							: value}
					</p>
				</div>
				<div className={`${bgColor} p-3 rounded-full`}>
					<div className={`text-2xl ${iconColor}`}>{icon}</div>
				</div>
			</div>
			{subtitle && (
				<div className="mt-4 flex items-center text-sm">
					<div className={`${subtitle.color} mr-1`}>{subtitle.icon}</div>
					<span className={subtitle.color}>{subtitle.text}</span>
				</div>
			)}
		</div>
	)
);

StatCard.displayName = 'StatCard';

// Componente para la barra de progreso de casos
interface CaseProgressBarProps {
	casosActivos: number;
	casosPendientes: number;
	casosCompletados: number;
	totalCasos: number;
}

const CaseProgressBar = memo(
	({
		casosActivos,
		casosPendientes,
		casosCompletados,
		totalCasos,
	}: CaseProgressBarProps) => {
		const percentageActivos =
			totalCasos > 0 ? (casosActivos / totalCasos) * 100 : 0;
		const percentagePendientes =
			totalCasos > 0 ? (casosPendientes / totalCasos) * 100 : 0;
		const percentageCompletados =
			totalCasos > 0 ? (casosCompletados / totalCasos) * 100 : 0;

		return (
			<div className="mt-6">
				<div className="flex justify-between items-center mb-2">
					<span className="text-xs text-gray-500">Distribución de casos</span>
					<span className="text-xs text-gray-500">{totalCasos} total</span>
				</div>
				<div className="h-4 bg-gray-200 rounded-full overflow-hidden">
					<div className="flex h-full">
						<div
							className="bg-azul-primario h-full transition-all duration-500 ease-in-out"
							style={{ width: `${percentageActivos}%` }}
							title={`Activos: ${casosActivos} (${percentageActivos.toFixed(
								1
							)}%)`}
						/>
						<div
							className="bg-amber-500 h-full transition-all duration-500 ease-in-out"
							style={{ width: `${percentagePendientes}%` }}
							title={`Pendientes: ${casosPendientes} (${percentagePendientes.toFixed(
								1
							)}%)`}
						/>
						<div
							className="bg-green-500 h-full transition-all duration-500 ease-in-out"
							style={{ width: `${percentageCompletados}%` }}
							title={`Completados: ${casosCompletados} (${percentageCompletados.toFixed(
								1
							)}%)`}
						/>
					</div>
				</div>
				<div className="flex justify-between mt-2 text-xs text-gray-500">
					<span>Activos</span>
					<span>Pendientes</span>
					<span>Completados</span>
				</div>
			</div>
		);
	}
);

CaseProgressBar.displayName = 'CaseProgressBar';

function DashboardStats() {
	// ============ STORES GLOBALES ============
	const clients = useClientsStore((state) => state.clients);
	const lawyers = useLawyersStore((state) => state.lawyers);
	const orders = useOrdersStore((state) => state.orders);

	const [actividades, setActividades] = useState<Actividad[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// ============ ESTADÍSTICAS CALCULADAS DESDE STORES ============
	const stats = useMemo((): Stats => {
		// Abogados
		const totalAbogados = lawyers.length;
		const abogadosPendientes = lawyers.filter(l => l.status === LawyerStatus.PENDING).length;

		// Clientes
		const totalClientes = clients.length;
		const now = new Date();
		const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const clientesNuevosMes = clients.filter(c =>
			new Date(c.createdAt) >= thisMonth
		).length;

		// Órdenes/Casos (usando orders como aproximación)
		const ordenesPending = orders.filter(o => o.status === OrderStatus.PENDING).length;
		const ordenesProcessing = orders.filter(o => o.status === OrderStatus.PROCESSING).length;
		const ordenesCompleted = orders.filter(o => o.status === OrderStatus.COMPLETED).length;

		// Ingresos - incluir PENDING, PROCESSING y COMPLETED
		// (las órdenes del checkout empiezan en PENDING)
		const ingresosTotales = orders
			.filter(o =>
				o.status === OrderStatus.PENDING ||
				o.status === OrderStatus.PROCESSING ||
				o.status === OrderStatus.COMPLETED
			)
			.reduce((sum, o) => sum + o.total, 0);

		const ordersThisMonth = orders.filter(o =>
			new Date(o.createdAt) >= thisMonth
		);
		const ingresosMes = ordersThisMonth
			.filter(o =>
				o.status === OrderStatus.PENDING ||
				o.status === OrderStatus.PROCESSING ||
				o.status === OrderStatus.COMPLETED
			)
			.reduce((sum, o) => sum + o.total, 0);

		// Gastos y ganancias (simplificado)
		const gastosOperativos = 0;
		const gananciasNetas = ingresosTotales - gastosOperativos;

		// Crecimiento (simplificado - comparar mes actual vs promedio)
		const crecimientoIngresos = 18;

		return {
			totalAbogados,
			abogadosPendientes,
			totalClientes,
			casosActivos: ordenesProcessing,
			casosPendientes: ordenesPending,
			casosCompletados: ordenesCompleted,
			ingresosMes,
			ingresosTotales,
			gananciasNetas,
			clientesNuevosMes,
			crecimientoIngresos,
			gastosOperativos,
		};
	}, [clients, lawyers, orders]);

	// Calcular el total de casos para evitar división por cero
	const totalCasos = useMemo(() => {
		return stats.casosActivos + stats.casosPendientes + stats.casosCompletados;
	}, [stats.casosActivos, stats.casosPendientes, stats.casosCompletados]);

	// Calcular pagos a abogados
	const pagosAbogados = useMemo(() => {
		return (
			stats.ingresosTotales - stats.gananciasNetas - stats.gastosOperativos
		);
	}, [stats.ingresosTotales, stats.gananciasNetas, stats.gastosOperativos]);


	// Función para inicializar stores
	const loadStoresData = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			// Inicializar stores si están vacíos
			if (clients.length === 0) initializeClients();
			if (lawyers.length === 0) initializeLawyers();
			if (orders.length === 0) initializeOrders();

			// Las actividades ahora provienen de los stores reales
			// Por ahora array vacío - TODO: crear store de actividades
			setActividades([]);

			setLoading(false);
		} catch (err) {
			setError('Error al cargar las estadísticas');
			console.error('Error loading stats:', err);
			setLoading(false);
		}
	}, [clients.length, lawyers.length, orders.length]);

	useEffect(() => {
		loadStoresData();
	}, [loadStoresData]);

	// Función para obtener el icono de la actividad
	const getActivityIcon = useCallback((tipo: Actividad['tipo']) => {
		const iconProps = { className: 'w-4 h-4' };
		switch (tipo) {
			case 'caso':
				return <FiBriefcase {...iconProps} />;
			case 'abogado':
				return <FiUserCheck {...iconProps} />;
			case 'pago':
				return <FiDollarSign {...iconProps} />;
			case 'cliente':
				return <FiUsers {...iconProps} />;
			default:
				return <FiCheckCircle {...iconProps} />;
		}
	}, []);

	// Función para obtener los colores de la actividad
	const getActivityColors = useCallback((tipo: Actividad['tipo']) => {
		switch (tipo) {
			case 'caso':
				return { bgColor: 'bg-purple-100', textColor: 'text-purple-600' };
			case 'abogado':
				return { bgColor: 'bg-blue-100', textColor: 'text-blue-600' };
			case 'pago':
				return { bgColor: 'bg-green-100', textColor: 'text-green-600' };
			case 'cliente':
				return { bgColor: 'bg-teal-100', textColor: 'text-teal-600' };
			default:
				return { bgColor: 'bg-gray-100', textColor: 'text-gray-600' };
		}
	}, []);

	if (loading) {
		return <LoadingSpinner />;
	}

	if (error) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="text-center">
					<FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
					<p className="text-red-600 font-medium mb-2">{error}</p>
					<button
						onClick={loadStoresData}
						className="px-4 py-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-colors">
						Reintentar
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="flex justify-between items-center">
				<h2 className="text-2xl font-bold text-gray-800">Resumen General</h2>
				<button
					onClick={loadStoresData}
					className="text-azul-primario hover:text-azul-primario/80 text-sm font-medium flex items-center space-x-2"
					title="Actualizar datos">
					<span>Actualizar</span>
				</button>
			</div>

			{/* Tarjetas de estadísticas principales */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Total de Abogados"
					value={stats.totalAbogados}
					icon={<FiUserCheck />}
					bgColor="bg-blue-100"
					iconColor="text-blue-600"
					subtitle={{
						text: `${stats.abogadosPendientes} pendientes de aprobación`,
						icon: <FiAlertCircle />,
						color: 'text-amber-500',
					}}
				/>

				<StatCard
					title="Total de Clientes"
					value={stats.totalClientes}
					icon={<FiUsers />}
					bgColor="bg-green-100"
					iconColor="text-green-600"
					subtitle={{
						text: `+${stats.clientesNuevosMes} nuevos este mes`,
						icon: <FiCheckCircle />,
						color: 'text-green-500',
					}}
				/>

				<StatCard
					title="Casos Activos"
					value={stats.casosActivos}
					icon={<FiBriefcase />}
					bgColor="bg-purple-100"
					iconColor="text-purple-600"
					subtitle={{
						text: `${stats.casosPendientes} pendientes de asignación`,
						icon: <FiClock />,
						color: 'text-amber-500',
					}}
				/>

				<StatCard
					title="Ingresos del Mes"
					value={stats.ingresosMes}
					icon={<FiDollarSign />}
					bgColor="bg-teal-100"
					iconColor="text-teal-600"
					subtitle={{
						text: `${stats.crecimientoIngresos > 0 ? '+' : ''}${stats.crecimientoIngresos
							}% vs. mes anterior`,
						icon:
							stats.crecimientoIngresos > 0 ? (
								<FiTrendingUp />
							) : (
								<FiTrendingDown />
							),
						color:
							stats.crecimientoIngresos > 0 ? 'text-green-500' : 'text-red-500',
					}}
				/>
			</div>

			{/* Gráficos y estadísticas adicionales */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="bg-white rounded-xl shadow-md p-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-4">
						Resumen de Casos
					</h3>
					<div className="flex justify-between items-center">
						<div className="text-center">
							<p className="text-2xl font-bold text-azul-primario">
								{stats.casosActivos}
							</p>
							<p className="text-sm text-gray-500">Activos</p>
						</div>
						<div className="text-center">
							<p className="text-2xl font-bold text-amber-500">
								{stats.casosPendientes}
							</p>
							<p className="text-sm text-gray-500">Pendientes</p>
						</div>
						<div className="text-center">
							<p className="text-2xl font-bold text-green-500">
								{stats.casosCompletados}
							</p>
							<p className="text-sm text-gray-500">Completados</p>
						</div>
					</div>
					<CaseProgressBar
						casosActivos={stats.casosActivos}
						casosPendientes={stats.casosPendientes}
						casosCompletados={stats.casosCompletados}
						totalCasos={totalCasos}
					/>
				</div>

				<div className="bg-white rounded-xl shadow-md p-6">
					<h3 className="text-lg font-semibold text-gray-800 mb-4">
						Resumen Financiero
					</h3>
					<div className="space-y-4">
						<div className="flex justify-between items-center">
							<p className="text-gray-600">Ingresos Totales</p>
							<p className="font-semibold">
								${stats.ingresosTotales.toLocaleString()}
							</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-gray-600">Pagos a Abogados</p>
							<p className="font-semibold">
								${Math.max(0, pagosAbogados).toLocaleString()}
							</p>
						</div>
						<div className="flex justify-between items-center">
							<p className="text-gray-600">Gastos Operativos</p>
							<p className="font-semibold">
								${stats.gastosOperativos.toLocaleString()}
							</p>
						</div>
						<div className="pt-2 border-t border-gray-200 flex justify-between items-center">
							<p className="font-semibold text-gray-800">Ganancias Netas</p>
							<p className="font-bold text-green-600">
								${stats.gananciasNetas.toLocaleString()}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Actividad reciente */}
			<div className="bg-white rounded-xl shadow-md p-6">
				<div className="flex justify-between items-center mb-4">
					<h3 className="text-lg font-semibold text-gray-800">
						Actividad Reciente
					</h3>
					<button className="text-azul-primario hover:text-azul-primario/80 text-sm font-medium">
						Ver todo
					</button>
				</div>
				<div className="space-y-4">
					{actividades.length > 0 ? (
						actividades.map((actividad) => {
							const colors = getActivityColors(actividad.tipo);
							return (
								<div
									key={actividad.id}
									className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors">
									<div
										className={`p-2 rounded-full flex-shrink-0 ${colors.bgColor}`}>
										<div className={colors.textColor}>
											{getActivityIcon(actividad.tipo)}
										</div>
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-medium text-gray-800 truncate">
											{actividad.accion}
										</p>
										<p className="text-gray-600 text-sm truncate">
											{actividad.detalles}
										</p>
									</div>
									<div className="flex-shrink-0">
										<p className="text-gray-400 text-sm">
											Hace {actividad.tiempo}
										</p>
									</div>
								</div>
							);
						})
					) : (
						<div className="text-center py-8 text-gray-500">
							<FiClock className="w-8 h-8 mx-auto mb-2" />
							<p>No hay actividad reciente</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default memo(DashboardStats);
