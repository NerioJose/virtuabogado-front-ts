export interface Message {
    id: string;
    orderId: string;
    senderId: string;
    content: string;
    isSystem: boolean;
    read: boolean;
    createdAt: string;
    sender?: {
        nombre: string;
        picture?: string | null;
    }
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    activeOrderId: string | null;
}
