import { createClient } from '@/utils/supabase/client';
import { Message } from '../types/chat.types';

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
        const supabase = createClient();
        const { data, error } = await supabase
            .from('Message')
            .insert({
                orderId,
                content,
                senderId,
                read: false
            })
            .select(`
                *,
                sender:User(nombre, picture)
            `)
            .single();

        if (error) throw error;
        return data as unknown as Message;
    },

    subscribeToMessages(orderId: string, callback: (payload: any) => void) {
        const supabase = createClient();
        return supabase
            .channel(`chat:${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Message',
                    filter: `orderId=eq.${orderId}`
                },
                callback
            )
            .subscribe();
    },

    async uploadFile(orderId: string, file: File): Promise<string> {
        const supabase = createClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `${orderId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('case-files')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('case-files')
            .getPublicUrl(fileName);

        return data.publicUrl;
    }
};
