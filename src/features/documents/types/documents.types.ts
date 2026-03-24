export interface Document {
    id: string;
    orderId: string;
    uploaderId: string;
    name: string;
    url: string;
    type: string;
    size: number;
    createdAt: Date;
}

export interface CreateDocumentRequest {
    orderId: string;
    name: string;
    url: string;
    type: string;
    size: number;
}
