import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services/chat.service';
import { Message } from '../types/chat.types';
import { useEffect } from 'react';

export const chatKeys = {
    all: ['chat'] as const,
    messages: (orderId: string) => [...chatKeys.all, 'messages', orderId] as const,
};

export function useChat(orderId: string) {
    const queryClient = useQueryClient();

    // 1. Obtener mensajes iniciales
    const { data: messages = [], isLoading, isError, error } = useQuery({
        queryKey: chatKeys.messages(orderId),
        queryFn: () => chatService.getMessages(orderId),
        enabled: !!orderId,
        retry: false
    });

    // La suscripción a Realtime ahora se maneja 100% de manera centralizada en GlobalChatListener 
    // lo cual actualiza el caché de TanStack Query automáticamente y enciende todas las UIs sin crear cientos de WebSockets!

    // 2. Mutación para enviar mensaje
    const sendMessageMutation = useMutation({
        mutationFn: ({ content, senderId }: { content: string, senderId: string }) => 
            chatService.sendMessage(orderId, content, senderId),
        onSuccess: (newMessage) => {
            queryClient.setQueryData<Message[]>(chatKeys.messages(orderId), (old = []) => {
                if (old.some(m => m.id === newMessage.id)) return old;
                return [...old, newMessage];
            });
        }
    });

    // 4. Mutación para enviar archivo
    const sendFileMutation = useMutation({
        mutationFn: async ({ file, senderId }: { file: File, senderId: string }) => {
            const publicUrl = await chatService.uploadFile(orderId, file);
            // Enviamos solo la URL para que el renderer la maneje nativamente de forma limpia
            // El renderer detectará el tipo de archivo por extensión
            return chatService.sendMessage(orderId, publicUrl, senderId);
        },
        onSuccess: (newMessage) => {
            queryClient.setQueryData<Message[]>(chatKeys.messages(orderId), (old = []) => {
                if (old.some(m => m.id === newMessage.id)) return old;
                return [...old, newMessage];
            });
        }
    });

    // 5. Mutación para eliminar mensaje
    const deleteMessageMutation = useMutation({
        mutationFn: (messageId: string) => chatService.deleteMessage(orderId, messageId),
        onSuccess: (_, messageId) => {
            queryClient.setQueryData<Message[]>(chatKeys.messages(orderId), (old = []) => {
                return old.filter(m => m.id !== messageId);
            });
        }
    });

    return {
        messages,
        isLoading,
        isError,
        error,
        sendMessage: sendMessageMutation.mutateAsync,
        isSending: sendMessageMutation.isPending,
        sendFile: sendFileMutation.mutateAsync,
        isUploading: sendFileMutation.isPending,
        deleteMessage: deleteMessageMutation.mutateAsync,
        isDeleting: deleteMessageMutation.isPending
    };
}
