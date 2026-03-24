import { CreateDocumentRequest, Document } from '../types/documents.types';

export const documentsService = {
    getAllByOrder: async (orderId: string): Promise<Document[]> => {
        const response = await fetch(`/api/documents?orderId=${orderId}`);
        if (!response.ok) throw new Error('Error fetching documents');
        return response.json();
    },

    create: async (data: CreateDocumentRequest): Promise<Document> => {
        const response = await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error creating document');
        }
        return response.json();
    },

    delete: async (id: string): Promise<void> => {
        const response = await fetch(`/api/documents?id=${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Error deleting document');
    }
};
