import imageCompression from 'browser-image-compression';

/**
 * Utilidad de compresión de Grado Militar.
 * Usa Web Workers para no bloquear el hilo principal.
 */
export async function compressImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file;

    const options = {
        maxSizeMB: 1, // Reducimos a ~1MB máximo garantizando legibilidad
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8,
    };

    try {
        
        const compressedFile = await imageCompression(file, options);
        
        return compressedFile;
    } catch (error) {
        console.error('❌ Error en compresión:', error);
        return file; // Fallback al original si falla
    }
}
