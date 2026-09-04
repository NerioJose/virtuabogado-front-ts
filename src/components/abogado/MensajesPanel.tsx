'use client';

import { useState, useMemo } from 'react';
import {
	FiSearch,
	FiUser,
	FiClock,
	FiMessageSquare,
	FiArrowLeft,
	FiLock,
	FiCheckCircle
} from 'react-icons/fi';
import { useOrdersByLawyer, useUpdateOrder } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { ChatWindow } from '@/features/chat/components/ChatWindow';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useMensajesPanel } from './hooks/useMensajesPanel';

interface MensajesPanelProps {
	abogadoId: string;
	initialClienteId?: string | null;
}

export default function MensajesPanel({ abogadoId, initialClienteId }: MensajesPanelProps) {
	const {
		conversacionActiva,
		setConversacionActiva,
		busqueda,
		setBusqueda,
		modalAbierto,
		setModalAbierto,
		conversaciones,
		isLoading,
		openConfirmModal,
		handleConfirmarCompletar,
		formatearFecha,
		isUpdating,
		ordenActual,
		unreadOrders,
		unreadCounts
	} = useMensajesPanel(abogadoId, initialClienteId);

	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-180px)] md:h-[calc(100vh-250px)] overflow-hidden bg-white rounded-3xl shadow-sm border border-slate-100">
			{/* Lista de conversaciones */}
			<div className={`w-full md:w-[350px] border-r border-slate-50 flex flex-col bg-white ${conversacionActiva ? 'hidden md:flex' : 'flex'}`}>
				<div className="p-6 border-b border-slate-50">
					<h2 className="text-xl font-black text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                        <div className="w-8 h-8 bg-azul-primario/10 rounded-lg flex items-center justify-center text-azul-primario">
                            <FiMessageSquare size={18} />
                        </div>
                        Mensajes
                    </h2>
					<div className="relative">
						<input
							type="text"
							placeholder="Buscar cliente o caso..."
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
							className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-azul-primario text-sm font-medium placeholder:text-slate-400"
						/>
						<FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
					</div>
				</div>

				<div className="flex-1 overflow-y-auto custom-scrollbar">
					{conversaciones.length === 0 ? (
						<div className="p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                <FiMessageSquare size={24} />
                            </div>
							<p className="text-slate-400 font-bold text-sm tracking-tight">No hay mensajes aún</p>
						</div>
					) : (
						conversaciones.map((conv: any) => (
							<div
								key={conv.id}
								onClick={() => setConversacionActiva(conv.id)}
								className={`p-5 mx-2 my-1 rounded-2xl cursor-pointer transition duration-200 group relative ${
									conversacionActiva === conv.id 
										? 'bg-azul-primario text-white shadow-lg shadow-azul-primario/25' 
										: (unreadCounts[conv.id] || 0) > 0 || unreadOrders.includes(conv.id)
											? 'bg-rose-50/70 border border-rose-200 hover:bg-rose-100'
											: 'hover:bg-slate-50'
								} ${conv.status === OrderStatus.COMPLETADO ? 'opacity-60' : ''}`}>
								{(unreadCounts[conv.id] || 0) > 0 && (
									<span className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-2xl" />
								)}
								<div className="flex justify-between items-start mb-1.5">
									<h3 className={`text-sm font-black truncate pr-2 flex items-center gap-2 ${conversacionActiva === conv.id ? 'text-white' : 'text-slate-800'}`}>
										{conv.participante}
										{unreadCounts[conv.id] > 0 && (
											<span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none shadow-sm shadow-red-500/40">
												{unreadCounts[conv.id] > 99 ? '99+' : unreadCounts[conv.id]}
											</span>
										)}
									</h3>
									<div className="flex items-center gap-2 shrink-0">
										{unreadOrders.includes(conv.id) && (
											<span className="w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-red-300" />
										)}
										<span className={`text-[10px] font-bold whitespace-nowrap uppercase tracking-tighter ${conversacionActiva === conv.id ? 'text-white/70' : 'text-slate-400'}`}>
											{formatearFecha(conv.fechaUltimoMensaje)}
										</span>
									</div>
								</div>
								<p className={`text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 ${conversacionActiva === conv.id ? 'text-white/90' : 'text-azul-primario'}`}>
									{conv.status === OrderStatus.COMPLETADO && <FiLock size={10} className={conversacionActiva === conv.id ? 'text-white' : 'text-slate-400'} />}
									{conv.caso}
								</p>
								<div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${conversacionActiva === conv.id ? 'bg-white' : (unreadCounts[conv.id] || 0) > 0 ? 'bg-red-500' : 'bg-slate-300'}`} />
                                    <p className={`text-xs truncate font-medium ${conversacionActiva === conv.id ? 'text-white/80' : (unreadCounts[conv.id] || 0) > 0 ? 'text-slate-700 font-bold' : 'text-slate-400 italic'}`}>
                                        {conv.ultimoMensaje}
                                    </p>
                                </div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Área de chat */}
			<div className={`w-full md:flex-1 flex flex-col bg-slate-50/30 ${!conversacionActiva ? 'hidden md:flex' : 'flex'}`}>
				{conversacionActiva ? (
					<>
						{/* Cabecera del Chat */}
						<div className="p-4 md:p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-sm z-10 shadow-sm">
							<div className="flex items-center gap-4">
								<button type="button" 
									onClick={() => setConversacionActiva(null)}
								    className="md:hidden p-2.5 bg-slate-100 text-slate-500 rounded-xl active:scale-90 transition"
                                >
                                    <FiArrowLeft size={20} />
                                </button>
                                <div className="w-12 h-12 bg-azul-primario/5 rounded-2xl flex items-center justify-center text-azul-primario shadow-inner">
                                    <FiUser size={24} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-black text-slate-800 leading-tight truncate">
                                        {conversaciones.find((c: any) => c.id === conversacionActiva)?.participante}
                                    </h3>
                                    <p className="text-[10px] text-azul-primario font-black uppercase tracking-widest truncate mt-0.5">
                                        {conversaciones.find((c: any) => c.id === conversacionActiva)?.caso}
                                    </p>
                                </div>
							</div>

							{conversacionActiva && ordenActual?.status !== OrderStatus.COMPLETADO && ordenActual?.status !== OrderStatus.CANCELADO && (
								<button type="button"
									onClick={() => openConfirmModal(conversacionActiva)}
									disabled={isUpdating}
									className="px-4 py-2.5 text-[10px] font-black text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-500 hover:text-white transition duration-300 disabled:opacity-50 uppercase tracking-widest shadow-sm active:scale-95"
								>
									{isUpdating ? 'Procesando...' : 'Finalizar Caso'}
								</button>
							)}
						</div>

						{/* Chat Real (Ocupa el resto del espacio) */}
						<div className="flex-1 overflow-hidden relative">
							<ChatWindow orderId={conversacionActiva} />
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center p-12 lg:p-24">
						<div className="text-center max-w-sm">
							<div className="mx-auto w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-8 text-azul-primario group animate-float">
								<FiMessageSquare size={48} className="group-hover:scale-110 transition-transform" />
							</div>
							<h3 className="text-slate-800 font-black text-2xl mb-4 tracking-tight">
								Tus Conversaciones
							</h3>
							<p className="text-slate-400 text-sm font-medium leading-relaxed">
								Selecciona un cliente de la lista lateral para gestionar sus consultas y compartir documentos de forma segura.
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
				title="Finalizar Caso"
				message="¿Estás seguro de que deseas completar este caso? Se cerrará el canal de comunicación permanente con el cliente."
				confirmText="Sí, Finalizar Caso"
				isLoading={isUpdating}
			/>
		</div>
	);
}
