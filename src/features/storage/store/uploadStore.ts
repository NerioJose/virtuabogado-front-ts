import { create } from 'zustand';

export type UploadStatus = 'compressing' | 'uploading' | 'paused' | 'error' | 'success' | 'canceled';

export interface FileUpload {
    id: string;
    fileName: string;
    fileSize: number;
    progress: number;
    status: UploadStatus;
    error?: string;
    orderId: string;
    publicUrl?: string;
}

interface UploadState {
    uploads: Record<string, FileUpload>;
    
    // Acciones
    addUpload: (upload: FileUpload) => void;
    updateProgress: (id: string, progress: number) => void;
    updateStatus: (id: string, status: UploadStatus, extra?: Partial<FileUpload>) => void;
    removeUpload: (id: string) => void;
}

export const useUploadStore = create<UploadState>((set) => ({
    uploads: {},

    addUpload: (upload) => set((state) => ({
        uploads: { ...state.uploads, [upload.id]: upload }
    })),

    updateProgress: (id, progress) => set((state) => ({
        uploads: {
            ...state.uploads,
            [id]: { ...state.uploads[id], progress }
        }
    })),

    updateStatus: (id, status, extra) => set((state) => ({
        uploads: {
            ...state.uploads,
            [id]: { ...state.uploads[id], status, ...extra }
        }
    })),

    removeUpload: (id) => set((state) => {
        const newUploads = { ...state.uploads };
        delete newUploads[id];
        return { uploads: newUploads };
    }),
}));
