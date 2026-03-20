import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { FiSend, FiPaperclip, FiLock } from 'react-icons/fi';

interface ChatWindowProps {
    orderId: string;
}

export const ChatWindow = ({ orderId }: ChatWindowProps) => {
    const { messages, isLoading: messagesLoading, setActiveOrder, sendMessage, sendFile, cleanup } = useChatStore();
    const { data: orders = [] } = useOrders();
    const { user } = useAuthStore();
    const [newMessage, setNewMessage] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const order = orders.find(o => o.id === orderId);
    const isChatDisabled = order?.status === OrderStatus.COMPLETED || order?.status === OrderStatus.CANCELLED;

    useEffect(() => {
        setActiveOrder(orderId);
        return () => cleanup();
    }, [orderId, setActiveOrder, cleanup]);

    useEffect(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user || isChatDisabled) return;

        try {
            await sendMessage(newMessage, user.id);
            setNewMessage('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || isChatDisabled) return;

        try {
            setIsUploading(true);
            await sendFile(file, user.id);
        } catch (error) {
            console.error('Failed to upload file:', error);
            alert('Error al subir el archivo');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (messagesLoading && messages.length === 0) {
        return <div className="p-4 text-center">Cargando chat...</div>;
    }

    return (
        <div className="flex flex-col h-[500px] bg-white rounded-lg shadow-md border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b bg-gray-50 rounded-t-lg flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Chat del Caso #{orderId.slice(0, 8)}</h3>
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
                                    className={`max-w-[70%] rounded-lg p-3 ${isMe
                                        ? 'bg-azul-primario text-white rounded-br-none'
                                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
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
                    disabled={!newMessage.trim() || isUploading || isChatDisabled}
                    className="p-2 bg-azul-primario text-white rounded-lg hover:bg-azul-primario/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <FiSend size={20} />
                </button>
            </form>
        </div>
    );
};
