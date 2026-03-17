import { create } from 'zustand';
import { Message } from '../types/chat.types';
import { chatService } from '../services/chat.service';

interface ChatStore {
    messages: Message[];
    isLoading: boolean;
    activeOrderId: string | null;
    subscription: any | null;

    // Actions
    setActiveOrder: (orderId: string) => void;
    loadMessages: (orderId: string) => Promise<void>;
    addMessage: (message: Message) => void;
    sendMessage: (content: string, senderId: string) => Promise<void>;
    sendFile: (file: File, senderId: string) => Promise<void>;
    cleanup: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
    messages: [],
    isLoading: false,
    activeOrderId: null,
    subscription: null,

    setActiveOrder: (orderId) => {
        set({ activeOrderId: orderId });
        get().loadMessages(orderId);
    },

    loadMessages: async (orderId) => {
        set({ isLoading: true });
        try {
            // Limpiar suscripción anterior si existe
            const prevSub = get().subscription;
            if (prevSub) prevSub.unsubscribe();

            const messages = await chatService.getMessages(orderId);
            set({ messages, isLoading: false });

            // Suscribirse a nuevos mensajes
            const subscription = chatService.subscribeToMessages(orderId, (payload) => {
                // Aquí podríamos fetchear el mensaje completo para tener el "sender", 
                // o optimísticamente añadirlo. Por simplicidad, añadimos el payload
                // pero idealmente deberíamos hacer un fetch o asegurar que el payload trae todo.
                // Supabase realtime payload no trae relaciones.
                const newMessage = payload.new as Message;
                get().addMessage(newMessage);
            });
            set({ subscription });

        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
            console.error('❌ [ChatStore] Error loading messages:', errorMessage);
            set({ isLoading: false });
        }
    },

    addMessage: (message) => {
        set((state) => {
            // Evitar duplicados si ya lo añadimos localmente
            if (state.messages.some(m => m.id === message.id)) return state;
            return { messages: [...state.messages, message] };
        });
    },

    sendMessage: async (content, senderId) => {
        const orderId = get().activeOrderId;
        if (!orderId) return;

        try {
            const newMessage = await chatService.sendMessage(orderId, content, senderId);
            get().addMessage(newMessage);
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    },

    sendFile: async (file: File, senderId: string) => {
        const orderId = get().activeOrderId;
        if (!orderId) return;

        try {
            const publicUrl = await chatService.uploadFile(orderId, file);
            // Mensaje formateado para archivos
            const content = `📎 Archivo adjunto: [${file.name}](${publicUrl})`;

            const newMessage = await chatService.sendMessage(orderId, content, senderId);
            get().addMessage(newMessage);
        } catch (error) {
            console.error('Error sending file:', error);
            throw error;
        }
    },

    cleanup: () => {
        const sub = get().subscription;
        if (sub) sub.unsubscribe();
        set({ messages: [], activeOrderId: null, subscription: null });
    }
}));
