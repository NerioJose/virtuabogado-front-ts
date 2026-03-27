import { useState, useMemo } from 'react';
import {
	FiSearch,
	FiUser,
	FiClock,
	FiMessageSquare,
	FiArrowLeft,
} from 'react-icons/fi';
import { useOrdersByLawyer, useUpdateOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface MensajesPanelProps {
	abogadoId: string;
	initialClienteId?: string | null;
}

export default function MensajesPanel({ abogadoId, initialClienteId }: MensajesPanelProps) {
	const { data: orders = [], isLoading } = useOrdersByLawyer(abogadoId);
	const [conversacionActiva, setConversacionActiva] = useState<string | null>(null);
	const [busqueda, setBusqueda] = useState('');
	const [modalAbierto, setModalAbierto] = useState(false);
	const [casoParaCompletar, setCasoParaCompletar] = useState<string | null>(null);
	const updateOrder = useUpdateOrder();

	const openConfirmModal = (orderId: string) => {
		setCasoParaCompletar(orderId);
		setModalAbierto(true);
	};

	const handleConfirmarCompletar = async () => {
		if (!casoParaCompletar) return;
		try {
			await updateOrder.mutateAsync({
				id: casoParaCompletar,
				data: {
					status: OrderStatus.COMPLETADO,
					closedAt: new Date().toISOString()
				}
			});
			setModalAbierto(false);
			setCasoParaCompletar(null);
		} catch (error) {
			console.error('Error al completar el caso:', error);
			alert('Hubo un error al intentar completar el caso.');
		}
	};

	// Filtrar conversaciones por búsqueda y mapear desde órdenes
	const conversaciones = useMemo(() => {
		return orders
			.filter(order => {
				if (initialClienteId && order.userId !== initialClienteId) return false;
				const term = busqueda.toLowerCase();
				return (
					order.userName?.toLowerCase().includes(term) ||
					order.items?.[0]?.serviceName?.toLowerCase().includes(term) ||
					order.id.toLowerCase().includes(term)
				);
			})
			.map(order => ({
				id: order.id,
				participante: order.userName || 'Cliente',
				ultimoMensaje: 'Ver conversación', // Podríamos traer el último mensaje si la API lo incluyera
				fechaUltimoMensaje: order.updatedAt || order.createdAt,
				caso: order.items?.[0]?.serviceName || 'Servicio Legal',
			}));
	}, [orders, busqueda]);

	// Formatear fecha
	const formatearFecha = (fecha: string | Date): string => {
		const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
		const hoy = new Date();
		const ayer = new Date(hoy);
		ayer.setDate(hoy.getDate() - 1);

		if (fechaObj.toDateString() === hoy.toDateString()) {
			return fechaObj.toLocaleTimeString('es-ES', {
				hour: '2-digit',
				minute: '2-digit',
			});
		} else if (fechaObj.toDateString() === ayer.toDateString()) {
			return 'Ayer';
		} else {
			return fechaObj.toLocaleDateString('es-ES', {
				day: '2-digit',
				month: '2-digit',
			});
		}
	};

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-250px)] overflow-hidden bg-white rounded-xl">
			{/* Lista de conversaciones */}
			<div className={`w-full md:w-1/3 border-r border-gray-100 flex flex-col ${conversacionActiva ? 'hidden md:flex' : 'flex'}`}>
				<div className="p-4 border-b border-gray-50">
					<h2 className="text-lg font-bold text-gray-800 mb-4">Mensajes</h2>
					<div className="relative">
						<input
							type="text"
							placeholder="Buscar cliente o caso..."
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
							className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-azul-primario text-sm"
						/>
						<FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
					</div>
				</div>

				<div className="flex-1 overflow-y-auto divide-y divide-gray-50">
					{conversaciones.length === 0 ? (
						<div className="p-8 text-center text-gray-400 text-sm">
							No se encontraron conversaciones
						</div>
					) : (
						conversaciones.map((conv) => (
							<div
								key={conv.id}
								onClick={() => setConversacionActiva(conv.id)}
								className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${conversacionActiva === conv.id ? 'bg-azul-claro/10 border-l-4 border-azul-primario' : ''
									}`}>
								<div className="flex justify-between items-start mb-1">
									<h3 className="font-semibold text-gray-900 truncate pr-2">
										{conv.participante}
									</h3>
									<span className="text-[10px] text-gray-400 whitespace-nowrap">
										{formatearFecha(conv.fechaUltimoMensaje)}
									</span>
								</div>
								<p className="text-xs text-azul-primario font-medium truncate mb-1">
									{conv.caso}
								</p>
								<p className="text-xs text-gray-500 truncate">
									{conv.ultimoMensaje}
								</p>
							</div>
						))
					)}
				</div>
			</div>

			{/* Área de chat */}
			<div className={`w-full md:w-2/3 flex flex-col bg-gray-50/30 ${!conversacionActiva ? 'hidden md:flex' : 'flex'}`}>
				{conversacionActiva ? (
					<>
						{/* Cabecera móvil */}
						<div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
							<div className="flex items-center">
								<button 
									onClick={() => setConversacionActiva(null)}
								className="mr-3 md:hidden p-2 hover:bg-gray-100 rounded-full"
							>
								<FiArrowLeft size={20} />
							</button>
							<div className="w-10 h-10 bg-azul-primario/10 rounded-full flex items-center justify-center mr-3 text-azul-primario">
								<FiUser size={20} />
							</div>
							<div>
								<h3 className="text-sm font-bold text-gray-900">
									{conversaciones.find(c => c.id === conversacionActiva)?.participante}
								</h3>
								<p className="text-[10px] text-azul-primario font-medium">
									{conversaciones.find(c => c.id === conversacionActiva)?.caso}
								</p>
							</div>
							</div>

							{conversacionActiva && orders.find(o => o.id === conversacionActiva)?.status !== OrderStatus.COMPLETADO && orders.find(o => o.id === conversacionActiva)?.status !== OrderStatus.CANCELADO && (
								<button
									onClick={() => openConfirmModal(conversacionActiva)}
									disabled={updateOrder.isPending}
									title="Finalizar caso"
									className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 whitespace-nowrap ml-2"
								>
									{updateOrder.isPending ? 'Un momento...' : 'Completar Caso'}
								</button>
							)}
						</div>

						{/* Chat Real */}
						<div className="flex-1 overflow-hidden">
							<ChatWindow orderId={conversacionActiva} />
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center p-8">
						<div className="text-center max-w-xs">
							<div className="mx-auto w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6 text-azul-primario/20">
								<FiMessageSquare size={40} />
							</div>
							<h3 className="text-gray-900 font-bold text-lg mb-2">
								Tus Conversaciones
							</h3>
							<p className="text-gray-500 text-sm">
								Selecciona un caso de la lista para ver los mensajes y documentos compartidos con el cliente.
							</p>
						</div>
					</div>
				)}
			</div>

			{/* Modal de confirmación */}
			<ConfirmModal
				isOpen={modalAbierto}
				onClose={() => setModalAbierto(false)}
				onConfirm={handleConfirmarCompletar}
				title="Completar Caso"
				message="¿Estás seguro de que deseas marcar este caso como completado? Esta acción es final y cerrará el chat de forma permanente."
				confirmText="Sí, Completar Caso"
				isLoading={updateOrder.isPending}
			/>
		</div>
	);
}
