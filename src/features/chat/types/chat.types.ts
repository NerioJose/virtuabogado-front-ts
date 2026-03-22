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
        rol?: string;
    }
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    activeOrderId: string | null;
}
