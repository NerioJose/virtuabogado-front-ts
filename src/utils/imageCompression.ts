/**
 * Utilidad para comprimir imágenes antes de subirlas al servidor.
 * Reduce el peso para ahorrar espacio en la base de datos y mejorar la velocidad de carga.
 */
export async function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.75): Promise<File> {
    // Si no es imagen, retornar tal cual
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                
                // Calcular proporciones
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(file);
                    return;
                }

                // Dibujar con suavizado
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a Blob (JPG suele ser más ligero para fotos)
                canvas.toBlob((blob) => {
                    if (blob) {
                        // Crear un nuevo archivo a partir del blob
                        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        
                        // Solo retornar la comprimida si realmente es más pequeña
                        if (compressedFile.size < file.size) {
                            console.log(`✅ Imagen comprimida: ${(file.size / 1024).toFixed(1)}KB -> ${(compressedFile.size / 1024).toFixed(1)}KB`);
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            
            img.onerror = () => resolve(file);
        };
        reader.onerror = () => resolve(file);
    });
}
