import { createClient } from '@/utils/supabase/client';
import { Message } from '../types/chat.types';
import { compressImage } from '@/utils/imageCompression';

export const chatService = {
    async getMessages(orderId: string): Promise<Message[]> {
        const response = await fetch(`/api/messages/${orderId}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al obtener mensajes');
        }
        return response.json();
    },

    async sendMessage(orderId: string, content: string, senderId: string): Promise<Message> {
        const response = await fetch(`/api/messages/${orderId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, senderId })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al enviar el mensaje');
        }
        
        return response.json();
    },

    subscribeToMessages(orderId: string, callback: (payload: any) => void) {
        const supabase = createClient();
        const channel = supabase.channel(`chat_${orderId}`);
        
        return channel
            .on(
                'broadcast',
                { event: 'new_message' },
                (payload) => {
                    
                    // Pasamos el payload empaquetado para mantener la compatibilidad con el formato anterior
                    callback({ new: payload.payload.new });
                }
            )
            .subscribe((status, error) => {
                if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Canal Realtime Error:', error);
                } else if (status === 'SUBSCRIBED') {
                    
                }
            });
    },

    async uploadFile(orderId: string, file: File): Promise<string> {
        // Comprimir si es una imagen antes de enviar al servidor
        const fileToUpload = file.type.startsWith('image/') 
            ? await compressImage(file) 
            : file;

        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${orderId}/${Date.now()}.${fileExt}`;

        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('bucket', 'case-files');
        formData.append('path', fileName);

        const response = await fetch('/api/storage/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Error en el servidor al subir el archivo');
        }

        const result = await response.json();
        return result.publicUrl;
    },

    async deleteMessage(orderId: string, messageId: string): Promise<void> {
        const response = await fetch(`/api/messages/${orderId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId })
        });

        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Error al eliminar el mensaje');
        }
    }
};
