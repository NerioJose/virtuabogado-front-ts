/**
 * Adapter para localStorage con tipos seguros
 */

export interface StorageAdapter {
    get<T>(key: string): T | null;
    set<T>(key: string, value: T): void;
    remove(key: string): void;
    clear(): void;
}

export class LocalStorageAdapter implements StorageAdapter {
    /**
     * Obtiene un valor del localStorage
     */
    get<T>(key: string): T | null {
        try {
            if (typeof window === 'undefined') return null;

            const item = localStorage.getItem(key);
            if (!item) return null;

            return JSON.parse(item) as T;
        } catch (error) {
            console.error(`Error reading from localStorage (key: ${key}):`, error);
            return null;
        }
    }

    /**
     * Guarda un valor en localStorage
     */
    set<T>(key: string, value: T): void {
        try {
            if (typeof window === 'undefined') return;

            const serializedValue = JSON.stringify(value);
            localStorage.setItem(key, serializedValue);
        } catch (error) {
            console.error(`Error writing to localStorage (key: ${key}):`, error);
        }
    }

    /**
     * Elimina un valor del localStorage
     */
    remove(key: string): void {
        try {
            if (typeof window === 'undefined') return;

            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing from localStorage (key: ${key}):`, error);
        }
    }

    /**
     * Limpia todo el localStorage
     */
    clear(): void {
        try {
            if (typeof window === 'undefined') return;

            localStorage.clear();
        } catch (error) {
            console.error('Error clearing localStorage:', error);
        }
    }
}

// Exportar instancia singleton
export const localStorageAdapter = new LocalStorageAdapter();
