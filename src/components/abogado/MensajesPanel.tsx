import { useState, useEffect } from 'react';
import {
	FiSearch,
	FiSend,
	FiPaperclip,
	FiUser,
	FiClock,
	FiMessageSquare,
} from 'react-icons/fi';

interface MensajesPanelProps {
	abogadoId: number;
}

interface Mensaje {
	id: number;
	remitente: string;
	destinatario: string;
	contenido: string;
	fecha: string;
	leido: boolean;
	caso?: string;
}

interface Conversacion {
	id: number;
	participante: string;
	ultimoMensaje: string;
	fechaUltimoMensaje: string;
	noLeidos: number;
	caso?: string;
}

export default function MensajesPanel({ abogadoId }: MensajesPanelProps) {
	const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
	const [mensajes, setMensajes] = useState<Mensaje[]>([]);
	const [conversacionActiva, setConversacionActiva] = useState<number | null>(
		null
	);
	const [nuevoMensaje, setNuevoMensaje] = useState('');
	const [loading, setLoading] = useState(true);
	const [busqueda, setBusqueda] = useState('');

	useEffect(() => {
		// Simulación de carga de datos
		const cargarConversaciones = async () => {
			try {
				// Aquí iría la llamada a la API para obtener las conversaciones del abogado
				// Por ahora, simulamos una respuesta después de 1 segundo
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Datos de ejemplo
				setConversaciones([
					{
						id: 1,
						participante: 'María González',
						ultimoMensaje: 'Gracias por la información proporcionada',
						fechaUltimoMensaje: '2023-06-19T14:30:00',
						noLeidos: 0,
						caso: 'Consulta sobre contrato laboral',
					},
					{
						id: 2,
						participante: 'Juan Pérez',
						ultimoMensaje:
							'¿Podríamos adelantar la cita para revisar los documentos?',
						fechaUltimoMensaje: '2023-06-18T09:45:00',
						noLeidos: 2,
						caso: 'Asesoría en divorcio',
					},
					{
						id: 3,
						participante: 'Elena Díaz',
						ultimoMensaje: 'Le adjunto los documentos solicitados',
						fechaUltimoMensaje: '2023-06-17T16:20:00',
						noLeidos: 0,
						caso: 'Consulta sobre herencia',
					},
					{
						id: 4,
						participante: 'Roberto Fernández',
						ultimoMensaje: 'Confirmo la cita para la firma del contrato',
						fechaUltimoMensaje: '2023-06-15T11:10:00',
						noLeidos: 0,
						caso: 'Revisión de contrato mercantil',
					},
				]);

				setLoading(false);
			} catch (error) {
				console.error('Error al cargar conversaciones:', error);
				setLoading(false);
			}
		};

		cargarConversaciones();
	}, [abogadoId]);

	// Cargar mensajes de una conversación
	const cargarMensajes = async (conversacionId: number) => {
		setConversacionActiva(conversacionId);

		try {
			// Aquí iría la llamada a la API para obtener los mensajes de la conversación
			// Por ahora, simulamos una respuesta
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Datos de ejemplo
			const mensajesEjemplo: Mensaje[] = [
				{
					id: 1,
					remitente: 'María González',
					destinatario: 'Carlos Méndez',
					contenido:
						'Buenos días, tengo algunas dudas sobre mi contrato laboral.',
					fecha: '2023-06-18T10:15:00',
					leido: true,
				},
				{
					id: 2,
					remitente: 'Carlos Méndez',
					destinatario: 'María González',
					contenido:
						'Buenos días María. Por supuesto, dígame qué dudas tiene y las revisaremos juntos.',
					fecha: '2023-06-18T10:30:00',
					leido: true,
				},
				{
					id: 3,
					remitente: 'María González',
					destinatario: 'Carlos Méndez',
					contenido:
						'Principalmente me preocupa la cláusula de no competencia, ¿es legal que sea tan restrictiva?',
					fecha: '2023-06-18T10:45:00',
					leido: true,
				},
				{
					id: 4,
					remitente: 'Carlos Méndez',
					destinatario: 'María González',
					contenido:
						'Tendría que revisar los detalles específicos. ¿Podría enviarme una copia del contrato para analizarlo?',
					fecha: '2023-06-18T11:00:00',
					leido: true,
				},
				{
					id: 5,
					remitente: 'María González',
					destinatario: 'Carlos Méndez',
					contenido: 'Claro, se lo envío adjunto en este mensaje.',
					fecha: '2023-06-18T11:30:00',
					leido: true,
				},
				{
					id: 6,
					remitente: 'Carlos Méndez',
					destinatario: 'María González',
					contenido:
						'Perfecto. He revisado el documento y efectivamente hay algunos puntos que podríamos cuestionar. Le recomendaría que programemos una videollamada para discutirlo en detalle.',
					fecha: '2023-06-19T09:15:00',
					leido: true,
				},
				{
					id: 7,
					remitente: 'María González',
					destinatario: 'Carlos Méndez',
					contenido: 'Me parece bien. ¿Podría ser mañana por la tarde?',
					fecha: '2023-06-19T10:00:00',
					leido: true,
				},
				{
					id: 8,
					remitente: 'Carlos Méndez',
					destinatario: 'María González',
					contenido: 'Tengo disponibilidad a las 16:00h. ¿Le viene bien?',
					fecha: '2023-06-19T10:30:00',
					leido: true,
				},
				{
					id: 9,
					remitente: 'María González',
					destinatario: 'Carlos Méndez',
					contenido:
						'Perfecto, a las 16:00h entonces. Gracias por la información proporcionada.',
					fecha: '2023-06-19T14:30:00',
					leido: true,
				},
			];

			setMensajes(mensajesEjemplo);

			// Marcar mensajes como leídos
			setConversaciones((prevConversaciones) =>
				prevConversaciones.map((conv) =>
					conv.id === conversacionId ? { ...conv, noLeidos: 0 } : conv
				)
			);
		} catch (error) {
			console.error('Error al cargar mensajes:', error);
		}
	};

	// Enviar un nuevo mensaje
	const enviarMensaje = () => {
		if (!nuevoMensaje.trim() || !conversacionActiva) return;

		// Crear nuevo mensaje
		const nuevoMensajeObj: Mensaje = {
			id: mensajes.length + 1,
			remitente: 'Carlos Méndez',
			destinatario:
				conversaciones.find((c) => c.id === conversacionActiva)?.participante ||
				'',
			contenido: nuevoMensaje,
			fecha: new Date().toISOString(),
			leido: true,
		};

		// Añadir mensaje a la lista
		setMensajes([...mensajes, nuevoMensajeObj]);

		// Actualizar última conversación
		setConversaciones((prevConversaciones) =>
			prevConversaciones.map((conv) =>
				conv.id === conversacionActiva
					? {
							...conv,
							ultimoMensaje: nuevoMensaje,
							fechaUltimoMensaje: new Date().toISOString(),
							noLeidos: 0,
					  }
					: conv
			)
		);

		// Limpiar campo de mensaje
		setNuevoMensaje('');
	};

	// Formatear fecha
	const formatearFecha = (fecha: string): string => {
		const fechaObj = new Date(fecha);
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
				year: '2-digit',
			});
		}
	};

	// Filtrar conversaciones por búsqueda
	const conversacionesFiltradas = conversaciones.filter(
		(conv) =>
			conv.participante.toLowerCase().includes(busqueda.toLowerCase()) ||
			(conv.caso && conv.caso.toLowerCase().includes(busqueda.toLowerCase()))
	);

	if (loading) {
		return (
			<div className="flex justify-center items-center h-64">
				<div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="flex h-[calc(100vh-200px)] overflow-hidden">
			{/* Lista de conversaciones */}
			<div className="w-1/3 border-r border-gray-200 overflow-y-auto">
				<div className="p-4 border-b border-gray-200">
					<div className="relative">
						<input
							type="text"
							placeholder="Buscar conversación..."
							value={busqueda}
							onChange={(e) => setBusqueda(e.target.value)}
							className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario"
						/>
						<FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
					</div>
				</div>

				<div className="divide-y divide-gray-200">
					{conversacionesFiltradas.length === 0 ? (
						<div className="p-4 text-center text-gray-500">
							No se encontraron conversaciones
						</div>
					) : (
						conversacionesFiltradas.map((conv) => (
							<div
								key={conv.id}
								onClick={() => cargarMensajes(conv.id)}
								className={`p-4 hover:bg-gray-50 cursor-pointer ${
									conversacionActiva === conv.id ? 'bg-azul-claro/20' : ''
								}`}>
								<div className="flex justify-between items-start">
									<div className="flex items-center">
										<div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
											<FiUser className="text-gray-600" />
										</div>
										<div>
											<h3 className="font-medium text-gray-900">
												{conv.participante}
											</h3>
											{conv.caso && (
												<p className="text-xs text-gray-500">{conv.caso}</p>
											)}
										</div>
									</div>
									<div className="text-xs text-gray-500">
										<FiClock className="inline mr-1" />
										{formatearFecha(conv.fechaUltimoMensaje)}
									</div>
								</div>
								<div className="mt-2 flex justify-between">
									<p className="text-sm text-gray-600 truncate w-4/5">
										{conv.ultimoMensaje}
									</p>
									{conv.noLeidos > 0 && (
										<span className="bg-azul-primario text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
											{conv.noLeidos}
										</span>
									)}
								</div>
							</div>
						))
					)}
				</div>
			</div>

			{/* Área de mensajes */}
			<div className="w-2/3 flex flex-col">
				{conversacionActiva ? (
					<>
						{/* Cabecera de la conversación */}
						<div className="p-4 border-b border-gray-200 flex items-center">
							<div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mr-3">
								<FiUser className="text-gray-600" />
							</div>
							<div>
								<h3 className="font-medium text-gray-900">
									{
										conversaciones.find((c) => c.id === conversacionActiva)
											?.participante
									}
								</h3>
								{conversaciones.find((c) => c.id === conversacionActiva)
									?.caso && (
									<p className="text-xs text-gray-500">
										{
											conversaciones.find((c) => c.id === conversacionActiva)
												?.caso
										}
									</p>
								)}
							</div>
						</div>

						{/* Mensajes */}
						<div className="flex-1 overflow-y-auto p-4 space-y-4">
							{mensajes.map((mensaje) => (
								<div
									key={mensaje.id}
									className={`flex ${
										mensaje.remitente === 'Carlos Méndez'
											? 'justify-end'
											: 'justify-start'
									}`}>
									<div
										className={`max-w-[70%] rounded-lg p-3 ${
											mensaje.remitente === 'Carlos Méndez'
												? 'bg-azul-primario text-white'
												: 'bg-gray-100 text-gray-800'
										}`}>
										<p>{mensaje.contenido}</p>
										<div
											className={`text-xs mt-1 flex justify-end items-center ${
												mensaje.remitente === 'Carlos Méndez'
													? 'text-azul-claro'
													: 'text-gray-500'
											}`}>
											<FiClock className="mr-1" />
											{formatearFecha(mensaje.fecha)}
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Área de entrada de mensaje */}
						<div className="p-4 border-t border-gray-200">
							<div className="flex items-center">
								<button
									className="p-2 text-gray-500 hover:text-azul-primario"
									title="Adjuntar archivo"
									aria-label="Adjuntar archivo">
									<FiPaperclip />
								</button>
								<input
									type="text"
									placeholder="Escribe un mensaje..."
									value={nuevoMensaje}
									onChange={(e) => setNuevoMensaje(e.target.value)}
									onKeyPress={(e) => e.key === 'Enter' && enviarMensaje()}
									className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario mx-2"
								/>
								<button
									onClick={enviarMensaje}
									className="p-2 bg-azul-primario text-white rounded-full hover:bg-azul-primario/90"
									title="Enviar mensaje"
									aria-label="Enviar mensaje">
									<FiSend />
								</button>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
							<div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
								<FiMessageSquare className="text-gray-400 text-xl" />
							</div>
							<h3 className="text-gray-900 font-medium">
								Selecciona una conversación
							</h3>
							<p className="text-gray-500 mt-1">
								Elige una conversación para ver los mensajes
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
