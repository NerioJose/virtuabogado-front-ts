'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useChat } from './useChat';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { OrderStatus } from '@/features/orders/types/orders.types';
import { useChatStore } from '../store/chatStore';

export function useChatViewModel(orderId: string) {
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

    const { data: response, isLoading: ordersLoading } = useOrders();
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

    const order = useMemo(() => {
        const orders = (response as any)?.data || [];
        return orders.find((o: any) => o.id === orderId);
    }, [response, orderId]);
    const isChatDisabled = order?.status === OrderStatus.COMPLETADO || order?.status === OrderStatus.CANCELADO;

    useEffect(() => {
        const savedPref = document.cookie
            .split('; ')
            .find(row => row.startsWith('chatSoundEnabled='))
            ?.split('=')[1];
        
        if (savedPref === 'false') {
            setSoundEnabled(false);
        } else {
            document.cookie = "chatSoundEnabled=true; path=/; max-age=31536000";
        }

        useChatStore.setState({ activeOrderId: orderId });
        useChatStore.getState().markAsRead(orderId);

        return () => {
            useChatStore.setState((state) =>
                state.activeOrderId === orderId ? { activeOrderId: null } : state
            );
        };
    }, [orderId]);

    const toggleSound = () => {
        const newState = !soundEnabled;
        setSoundEnabled(newState);
        document.cookie = `chatSoundEnabled=${newState}; path=/; max-age=31536000`;
        if (newState && audioRef.current) {
            audioRef.current.play().catch(console.error);
        }
    };

    useEffect(() => {
        prevMessagesLengthRef.current = messages.length;
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !user || isChatDisabled || isSending) return;

        const contentToSend = newMessage.trim();
        setNewMessage('');

        try {
            await sendMessage({ content: contentToSend, senderId: user.id });
        } catch (error) {
            console.error('Failed to send message:', error);
            setNewMessage(contentToSend);
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

    return {
        messages,
        messagesLoading: messagesLoading && messages.length === 0,
        ordersLoading,
        isError,
        error,
        user,
        order,
        isChatDisabled,
        newMessage,
        setNewMessage,
        soundEnabled,
        toggleSound,
        isSending,
        isUploading,
        handleSend,
        handleFileSelect,
        handleDeleteClick,
        confirmDelete,
        sendMessage,
        errorModalOpen,
        setErrorModalOpen,
        errorModalMessage,
        deleteModalOpen,
        setDeleteModalOpen,
        messagesContainerRef,
        fileInputRef,
        audioRef
    };
}
