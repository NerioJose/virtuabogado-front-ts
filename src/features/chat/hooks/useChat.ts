'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatService } from '../services/chat.service';
import { Message } from '../types/chat.types';
import { useEffect } from 'react';
import { useResumableUpload } from '@/features/storage/hooks/useResumableUpload';
import { compressImage } from '@/utils/imageCompression';

export const chatKeys = {
    all: ['chat'] as const,
    messages: (orderId: string) => [...chatKeys.all, 'messages', orderId] as const,
};

export function useChat(orderId: string) {
    const queryClient = useQueryClient();
    const { startUpload } = useResumableUpload();

    // 1. Obtener mensajes iniciales
    const { data: messages = [], isLoading, isError, error } = useQuery({
        queryKey: chatKeys.messages(orderId),
        queryFn: () => chatService.getMessages(orderId),
        enabled: !!orderId,
        retry: false
    });

    // 2. Suscripción LOCAL para esta ventana de chat específica
    useEffect(() => {
        if (!orderId) return;
        
        const channel = chatService.subscribeToMessages(orderId, (payload) => {
            if (payload.new) {
                queryClient.setQueryData<Message[]>(chatKeys.messages(orderId), (old = []) => {
                    const current = Array.isArray(old) ? old : [];
                    if (current.some(m => m.id === payload.new.id)) return current;
                    return [...current, payload.new];
                });
            }
        });
        
        return () => {
            channel.unsubscribe().catch((err: any) => console.warn('WebSocket Unsubscribe error:', err));
        };
    }, [orderId, queryClient]);

    // 3. Mutación para enviar mensaje con OPTIMISTIC UI
    const sendMessageMutation = useMutation({
        mutationFn: ({ content, senderId }: { content: string, senderId: string }) => 
            chatService.sendMessage(orderId, content, senderId),
        
        onMutate: async (newMessage) => {
            await queryClient.cancelQueries({ queryKey: chatKeys.messages(orderId) });
            const previousMessages = queryClient.getQueryData<Message[]>(chatKeys.messages(orderId));
            
            const optimisticId = `temp-${Date.now()}`;
            const optimisticMessage: Message = {
                id: optimisticId,
                orderId,
                senderId: newMessage.senderId,
                content: newMessage.content,
                createdAt: new Date().toISOString(),
                isPending: true
            } as any;

            queryClient.setQueryData<Message[]>(chatKeys.messages(orderId), (old = []) => [...old, optimisticMessage]);
            return { previousMessages };
        },

        onError: (err, newMessage, context) => {
            if (context?.previousMessages) {
                queryClient.setQueryData(chatKeys.messages(orderId), context.previousMessages);
            }
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: chatKeys.messages(orderId) });
        }
    });

    // 4. Mutación para enviar archivo con RESUMABLE UPLOAD (Grado Militar)
    const sendFileMutation = useMutation({
        mutationFn: async ({ file, senderId }: { file: File, senderId: string }) => {
            // A. Comprimir (Web Worker)
            const fileToUpload = await compressImage(file);
            
            // B. Carga reanudable (TUS)
            const publicUrl = await startUpload(orderId, fileToUpload);
            
            // C. Registrar mensaje en chat
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
