import { memo, useMemo } from 'react';
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
import { useClients } from '@/features/clients/hooks/useClients';
import { useLawyers } from '@/features/lawyers/hooks/useLawyers';
import { LawyerStatus } from '@/features/lawyers/types/lawyers.types';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';
import { formatUSD, serializeFinance } from '@/lib/finance';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/utils/formatters';

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
	pagosAbogados: number; // NEW: Añadido
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


// Skeleton shimmer para tarjetas en carga
const SkeletonCard = () => (
	<div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
		<div className="flex items-center justify-between">
			<div>
				<div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
				<div className="h-8 bg-gray-200 rounded w-16"></div>
			</div>
			<div className="w-12 h-12 rounded-full bg-gray-200"></div>
		</div>
		<div className="mt-4 h-4 bg-gray-200 rounded w-40"></div>
	</div>
);

// Skeleton para resumen financiero
const SkeletonFinancial = () => (
	<div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
		<div className="h-5 bg-gray-200 rounded w-40 mb-6"></div>
		{[1,2,3,4].map(i => (
			<div key={i} className="flex justify-between items-center mb-4">
				<div className="h-4 bg-gray-200 rounded w-32"></div>
				<div className="h-4 bg-gray-200 rounded w-20"></div>
			</div>
		))}
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
							(title.toLowerCase().includes('ingreso') || title.toLowerCase().includes('ganancia'))
							? formatUSD(value)
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
	// ============ STORES GLOBALES & HOOKS ============
	const user = useAuthStore(state => state.user);
	const { data: clients = [], isLoading: clientsLoading } = useClients();
	const { data: lawyers = [], isLoading: lawyersLoading } = useLawyers();
	const { data: orders = [], isLoading: ordersLoading } = useOrders();
	
	// GET UNIFIED FINANCIAL SUMMARY (Single Source of Truth)
	const { data: summary, isLoading: financialLoading } = useQuery({
		queryKey: ['finances-summary-dashboard', user?.id],
		queryFn: () => getFinancialSummary({ dateRange: 'all' }, { id: user!.id, rol: user!.rol as any }),
		enabled: !!user
	});

	const isLoading = clientsLoading || lawyersLoading || ordersLoading || financialLoading;

	// ============ ESTADÍSTICAS CALCULADAS (Single Source of Truth) ============
	const stats = useMemo((): Stats => {
		// Basic Counts (Client-side from fetched lists)
		const totalAbogados = lawyers.length;
		const abogadosPendientes = lawyers.filter(l => l.status === LawyerStatus.PENDING).length;
		const totalClientes = clients.length;
		
		const now = new Date();
		const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
		const clientesNuevosMes = clients.filter(c => new Date(c.createdAt) >= thisMonth).length;

		const ordenesPending = orders.filter(o => o.status === OrderStatus.PENDIENTE).length;
		const ordenesProcessing = orders.filter(o => o.status === OrderStatus.EN_PROGRESO).length;
		const ordenesCompleted = orders.filter(o => o.status === OrderStatus.COMPLETADO).length;

		// PRECISIÓN FINANCIERA: Strictly from Server Actions (getFinancialSummary)
		return {
			totalAbogados,
			abogadosPendientes,
			totalClientes,
			casosActivos: ordenesProcessing,
			casosPendientes: ordenesPending,
			casosCompletados: ordenesCompleted,
			ingresosMes: summary?.totalIncome || 0,
			ingresosTotales: summary?.totalIncome || 0,
			gananciasNetas: summary?.realProfit || 0,
			clientesNuevosMes,
			crecimientoIngresos: 0,
			gastosOperativos: summary?.operationalCostsAndTaxes || 0,
			pagosAbogados: summary?.pendingLawyerPayments || 0,
		};
	}, [clients, lawyers, orders, summary]);

	// Total cases for progress bar
	const totalCasos = stats.casosActivos + stats.casosPendientes + stats.casosCompletados;



return (
	<div className="space-y-8">
		<div className="flex justify-between items-center">
			<h2 className="text-2xl font-bold text-gray-800">Resumen General</h2>
			{isLoading && <span className="text-sm text-gray-400 animate-pulse">Actualizando datos...</span>}
		</div>

		{/* Tarjetas de estadísticas principales */}
		<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
			{isLoading ? (
				<>
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
					<SkeletonCard />
				</>
			) : (
				<>
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
							text: `${stats.crecimientoIngresos > 0 ? '+' : ''}${stats.crecimientoIngresos.toFixed(1)}% vs. mes anterior`,
							icon: stats.crecimientoIngresos > 0 ? <FiTrendingUp /> : <FiTrendingDown />,
							color: stats.crecimientoIngresos > 0 ? 'text-green-500' : 'text-red-500',
						}}
					/>
				</>
			)}
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
					<div className="flex justify-between items-center text-sm">
						<p className="text-gray-600">Ingresos Totales</p>
						<p className="font-semibold">
							{formatUSD(stats.ingresosTotales)}
						</p>
					</div>
					<div className="flex justify-between items-center text-sm">
						<p className="text-gray-600">Pagos a Abogados</p>
						<p className="font-semibold text-blue-600">
							{formatUSD(stats.pagosAbogados)}
						</p>
					</div>
					<div className="flex justify-between items-center text-sm">
						<p className="text-gray-600">Gastos y Tax</p>
						<p className="font-semibold text-orange-600">
							{formatUSD(stats.gastosOperativos)}
						</p>
					</div>
					<div className="pt-2 border-t border-gray-200 flex justify-between items-center">
						<p className="font-bold text-gray-800 uppercase tracking-tighter text-xs">Ganancia Real</p>
						<p className="font-bold text-green-600 text-xl">
							{formatUSD(stats.gananciasNetas)}
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
			</div>
			<div className="text-center py-8 text-gray-500">
				<FiClock className="w-8 h-8 mx-auto mb-2" />
				<p>No hay actividad reciente</p>
			</div>
		</div>
	</div>
);
}

export default memo(DashboardStats);
