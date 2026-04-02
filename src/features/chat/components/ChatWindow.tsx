import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { FiSend, FiPaperclip, FiLock, FiVolume2, FiVolumeX, FiFileText, FiDownload, FiImage, FiTrash2, FiShield } from 'react-icons/fi';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useChatStore } from '../store/chatStore';

interface ChatWindowProps {
    orderId: string;
    className?: string;
}

export const ChatWindow = ({ orderId, className }: ChatWindowProps) => {
    const { 
        messages, 
        isLoading: messagesLoading, 
        isError, 
        error, 
        sendMessage, 
        sendFile, 
        deleteMessage,
        isSending, 
        isUploading 
    } = useChat(orderId);
	// ============ REACT QUERY ============
	const { data: response, isLoading } = useOrders();
	const orders = response?.data || [];
	const { user } = useAuthStore();
    const [newMessage, setNewMessage] = useState('');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [errorModalMessage, setErrorModalMessage] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    const prevMessagesLengthRef = useRef(0);

    const order = orders.find(o => o.id === orderId);
    const isChatDisabled = order?.status === OrderStatus.COMPLETADO || order?.status === OrderStatus.CANCELADO;

    useEffect(() => {
        // Init sound preference from cookies
        const savedPref = document.cookie
            .split('; ')
            .find(row => row.startsWith('chatSoundEnabled='))
            ?.split('=')[1];
        
        if (savedPref === 'false') {
            setSoundEnabled(false);
        } else {
             // Forzar que siempre se guarde explícitamente y esté activo inicialmente como solicitaste
             document.cookie = "chatSoundEnabled=true; path=/; max-age=31536000";
        }

        // Marcar como leído al entrar al chat
        useChatStore.getState().markAsRead(orderId);
    }, [orderId]);

    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        document.cookie = `chatSoundEnabled=${newState}; path=/; max-age=31536000`;
        // Probar el sonido
        if (newState && audioRef.current) {
            audioRef.current.play().catch(console.error);
        }
    };

    useEffect(() => {
        // El GlobalChatListener ahora se encarga de reproducir el sonido de los mensajes nuevos 
        // para evitar que suene doble.
        prevMessagesLengthRef.current = messages.length;

        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages, soundEnabled, user?.id]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || isChatDisabled || isSending) return;

        const contentToSend = newMessage.trim();
        setNewMessage(''); // Vaciar input sincrónicamente previene doble submit por Enter rápido

        try {
            await sendMessage({ content: contentToSend, senderId: user.id });
        } catch (error) {
            console.error('Failed to send message:', error);
            setNewMessage(contentToSend); // Restaurar si falla en la red
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || isChatDisabled) return;

        try {
            await sendFile({ file, senderId: user.id });
        } catch (error: any) {
            console.error('Failed to upload file:', error);
            setErrorModalMessage(error.message || 'Error desconocido al subir el archivo.');
            setErrorModalOpen(true);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteClick = (messageId: string) => {
        setMessageToDelete(messageId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!messageToDelete) return;
        try {
            await deleteMessage(messageToDelete);
        } catch (error: any) {
            setErrorModalMessage(error.message || 'No se pudo eliminar el mensaje.');
            setErrorModalOpen(true);
        } finally {
            setDeleteModalOpen(false);
            setMessageToDelete(null);
        }
    };

    // Lista de extensiones que deben tratarse como archivos/media
    const MEDIA_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'mp3', 'wav', 'mp4', 'mov'];

    // Helper para convertir URLs en texto plano a links clicables
    const linkifyText = (text: string, isMe: boolean) => {
        // Regex que detecta http://, https://, www. y dominios comunes con extensiones TLD populares
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(?:com|net|org|edu|gov|io|co|es|cl|mx|ar|pe|co\.ve)(?:\/[^\s]*)?)/gi;
        const parts = text.split(urlRegex);
        
        return parts.map((part, i) => {
            if (part && part.match(urlRegex)) {
                // Prevenir capturar puntuación al final de una frase (ej: "mira google.com.")
                let cleanUrl = part;
                let suffix = '';
                const lastChar = cleanUrl.slice(-1);
                if (['.', ',', ')', '!', '?', ';'].includes(lastChar)) {
                    suffix = lastChar;
                    cleanUrl = cleanUrl.slice(0, -1);
                }

                const href = cleanUrl.startsWith('http') 
                    ? cleanUrl 
                    : `https://${cleanUrl.startsWith('www.') ? cleanUrl : cleanUrl}`;

                return (
                    <span key={i}>
                        <a 
                            href={href} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`${isMe ? 'text-white underline hover:text-blue-100' : 'text-azul-primario underline hover:text-azul-primario/80'} transition-opacity break-all font-medium`}
                        >
                            {cleanUrl}
                        </a>
                        {suffix}
                    </span>
                );
            }
            return part;
        });
    };

    // Helper para detectar si un mensaje es un archivo/imagen
    const renderMessageContent = (msg: any) => {
        let content = msg.content;
        let isMedia = false;
        let url = '';
        let fileName = 'Archivo';
        const isMe = msg.senderId === user?.id;

        // 1. Detectar si es un link de Markdown de los mensajes viejos: [name](url)
        const mdLinkRegex = /\[(.*?)\]\((https?:\/\/.*?)\)/;
        const match = content.match(mdLinkRegex);

        if (match) {
            isMedia = true;
            fileName = match[1];
            url = match[2];
        } else if (content.startsWith('http') || content.startsWith('www.') || content.match(/^[a-zA-Z0-9.-]+\.(?:com|net|org|edu|gov|io|co|es|cl|mx|ar|pe|co\.ve)/i)) {
            // 2. Solo tratar como media si tiene una extensión conocida o es un archivo subido
            const tempUrl = content.split('?')[0].toLowerCase();
            const hasMediaExtension = MEDIA_EXTENSIONS.some(ext => tempUrl.endsWith(`.${ext}`));
            
            if (hasMediaExtension) {
                isMedia = true;
                url = content;
                fileName = url.split('/').pop()?.split('?')[0] || 'Archivo';
            }
        }

        // Si NO es media (archivo/imagen), renderizar como texto linkificado
        if (!isMedia) {
            return (
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {linkifyText(content, isMe)}
                </div>
            );
        }

        const extension = url.split('.').pop()?.split('?')[0].toLowerCase();
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '');

        if (isImage) {
            return (
                <div className="space-y-2 group">
                    <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-sm transition-transform hover:scale-[1.02] bg-black/5">
                        <img 
                            src={url} 
                            alt="Imagen enviada" 
                            className="max-w-full h-auto object-cover max-h-64 mx-auto block"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a 
                                href={url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors"
                                title="Ver pantalla completa"
                            >
                                <FiImage size={20} />
                            </a>
                        </div>
                    </div>
                    <a 
                        href={url} 
                        download={fileName}
                        target="_blank"
                        className="flex items-center gap-2 text-[10px] font-medium opacity-80 hover:opacity-100 transition-opacity uppercase tracking-wider"
                    >
                        <FiDownload size={12} /> Descargar Imagen
                    </a>
                </div>
            );
        }

        return (
            <div className="space-y-2 text-left">
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isMe 
                    ? 'bg-white/10 border-white/20 text-white' 
                    : 'bg-white border-gray-200 text-gray-800'
                } shadow-sm`}>
                    <div className={`p-2 rounded-lg ${
                        isMe ? 'bg-white/20' : 'bg-azul-primario/10 text-azul-primario'
                    }`}>
                        <FiFileText size={24} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate" title={fileName}>{fileName}</p>
                        <p className="text-[10px] opacity-60 uppercase">{extension} Documento</p>
                    </div>
                    <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`p-2 rounded-lg transition-colors ${
                            isMe ? 'hover:bg-white/20' : 'hover:bg-gray-100'
                        }`}
                        title="Descargar archivo"
                    >
                        <FiDownload size={18} />
                    </a>
                </div>
            </div>
        );
    };

    if (messagesLoading && messages.length === 0) {
        return <div className="p-4 text-center">Cargando chat...</div>;
    }

    if (isError) {
        return (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg shadow border border-red-200 text-center m-4">
                <p className="font-bold mb-2">Error al cargar chat</p>
                <p className="text-sm">{error instanceof Error ? error.message : 'Error desconocido de red'}</p>
                <p className="text-xs text-red-400 mt-2">ID: {orderId}</p>
            </div>
        );
    }

    return (
        <div className={`flex flex-col bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden ${className || 'h-[500px] md:h-[600px] lg:h-[700px] max-h-[85vh]'}`}>
            {/* Audio oculto forzado */}
            <audio ref={audioRef} src="/virtuabogado-chat.mp3" preload="auto" />

            {/* Header */}
            <div className="p-4 border-b bg-gray-50 rounded-t-lg flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-gray-700 truncate text-sm md:text-base">Chat del Caso #{orderId.slice(0, 8)}</h3>
                    <button 
                        onClick={toggleSound} 
                        type="button"
                        className="text-gray-400 hover:text-azul-primario transition-colors focus:outline-none"
                        title={soundEnabled ? 'Silenciar notificaciones' : 'Activar notificaciones'}
                    >
                        {soundEnabled ? <FiVolume2 size={18} /> : <FiVolumeX size={18} />}
                    </button>
                </div>
                {isChatDisabled && (
                    <span className="flex items-center text-red-500 text-sm font-medium">
                        <FiLock className="mr-1" /> Chat Cerrado ({order?.status})
                    </span>
                )}
            </div>

            {/* Messages Area */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                {messages.length === 0 ? (
                    <p className="text-center text-gray-500 my-10">No hay mensajes aún. ¡Inicia la conversación!</p>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.senderId === user?.id;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`relative group/msg p-3 rounded-2xl ${
                                        isMe
                                            ? 'bg-azul-primario text-white rounded-br-none ml-12 lg:ml-24'
                                            : 'bg-gray-100 text-gray-800 rounded-bl-none mr-12 lg:mr-24'
                                    } max-w-[85%] lg:max-w-[70%] xl:max-w-[60%] shadow-sm`}
                                >
                                    {(isMe || user?.rol === 'ADMIN') && (
                                        <button
                                            onClick={() => handleDeleteClick(msg.id)}
                                            className={`absolute ${isMe ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition-all focus:outline-none`}
                                            title="Eliminar mensaje"
                                        >
                                            <FiTrash2 size={16} />
                                        </button>
                                    )}
                                    {!isMe && (
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                                                {msg.sender?.nombre || 'Abogado'}
                                            </span>
                                            {msg.sender?.rol === 'ADMIN' && (
                                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-vinotinto text-white text-[8px] font-black uppercase tracking-tighter border border-vinotinto/20 shadow-sm">
                                                    <FiShield size={8} className="text-white" /> ADMIN
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {renderMessageContent(msg)}
                                    <span className={`text-xs block mt-1 ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}

            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t flex items-center gap-2 relative">
                {isChatDisabled && (
                    <div className="absolute inset-0 bg-gray-100/50 cursor-not-allowed z-10 flex items-center justify-center">
                        <span className="text-gray-500 font-medium">Este caso ha finalizado. No se pueden enviar más mensajes.</span>
                    </div>
                )}

                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx"
                    disabled={isChatDisabled}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading || isChatDisabled}
                    className={`p-2 text-gray-400 hover:text-gray-600 transition-colors ${isUploading ? 'animate-pulse' : ''}`}
                    title="Adjuntar archivo"
                >
                    <FiPaperclip size={20} />
                </button>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isUploading ? "Subiendo archivo..." : "Escribe un mensaje..."}
                    disabled={isUploading || isChatDisabled}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario disabled:bg-gray-100"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim() || isUploading || isSending || isChatDisabled}
                    className="p-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FiSend size={20} />
                </button>
            </form>

            {/* Modal de Alerta UI Premium */}
            <ConfirmModal
                isOpen={errorModalOpen}
                onClose={() => setErrorModalOpen(false)}
                onConfirm={() => setErrorModalOpen(false)}
                title="Atención"
                message={errorModalMessage}
                confirmText="Entendido"
                showCancel={false}
            />

            {/* Confirmación de eliminación */}
            <ConfirmModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar Mensaje"
                message="¿Estás seguro de que deseas eliminar este mensaje? Esta acción no se puede deshacer y el mensaje desaparecerá para todas las partes."
                confirmText="Eliminar para todos"
                cancelText="Cancelar"
            />
        </div>
    );
};
