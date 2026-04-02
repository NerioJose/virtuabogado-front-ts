import { createClient } from '@/utils/supabase/client';
import { useUploadStore } from '../store/uploadStore';
import { useCallback, useRef } from 'react';

/**
 * Hook para gestionar cargas de archivos reanudables (Protocolo TUS)
 */
export function useResumableUpload() {
    const { addUpload, updateProgress, updateStatus } = useUploadStore();
    const activeUploads = useRef<Record<string, any>>({});

    const startUpload = useCallback(async (
        orderId: string, 
        file: File, 
        bucket: string = 'case-files'
    ) => {
        const supabase = createClient();
        const id = `${orderId}-${Date.now()}-${file.name}`;
        const fileExt = file.name.split('.').pop();
        const fileName = `${orderId}/${Date.now()}.${fileExt}`;
        const path = fileName;

        // 1. Agregar a la tienda global
        addUpload({
            id,
            fileName: file.name,
            fileSize: file.size,
            progress: 0,
            status: 'uploading',
            orderId
        });

        // 2. Ejecutar carga reanudable (TUS)
        try {
            // Fingerprint para localStorage (estándar TUS)
            const fingerprint = `tus-${file.name}-${file.size}-${file.lastModified}`;

            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: true,
                    resumable: true,
                    onProgressUpdate: (progress) => {
                        const percent = Math.floor((progress.loaded / progress.total) * 100);
                        updateProgress(id, percent);
                    }
                });

            if (error) throw error;

            // 3. Obtener URL pública al finalizar
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(path);

            updateStatus(id, 'success', { publicUrl: publicUrlData.publicUrl });
            
            // Limpiar fingerprint al éxito
            localStorage.removeItem(fingerprint);

            return publicUrlData.publicUrl;

        } catch (err: any) {
            console.error('❌ Resumable Upload Error:', err);
            updateStatus(id, 'error', { error: err.message || 'Error en la subida' });
            throw err;
        }
    }, [addUpload, updateProgress, updateStatus]);

    const cancelUpload = useCallback((id: string) => {
        // En TUS con el cliente de Supabase, la cancelación se suele gestionar 
        // interrumpiendo la petición. Por ahora marcamos como cancelado en la tienda.
        updateStatus(id, 'canceled');
        if (activeUploads.current[id]) {
            // Nota: El cliente nativo de Supabase no expone un 'abort' directo fácilmente 
            // fuera de la promesa, pero al desmontar o ignorar el resultado logramos el efecto.
        }
    }, [updateStatus]);

    return { startUpload, cancelUpload };
}
