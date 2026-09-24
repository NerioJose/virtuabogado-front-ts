export interface Message {
    id: string;
    orderId: string;
    senderId: string;
    content: string;
    isSystem: boolean;
    readBy?: string[];
    createdAt: string;
    sender?: {
        nombre: string;
        picture?: string | null;
        rol?: string;
    };
    isPending?: boolean;
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    activeOrderId: string | null;
}
