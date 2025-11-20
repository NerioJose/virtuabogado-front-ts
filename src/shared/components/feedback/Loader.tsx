'use client';

/**
 * Componente Loader reutilizable
 */

import { cn } from '@/shared/utils/cn';

interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    text?: string;
}

const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
};

export function Loader({ size = 'md', className, text }: LoaderProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div
                className={cn(
                    'border-azul-primario border-t-transparent rounded-full animate-spin',
                    sizeStyles[size],
                    className
                )}
            />
            {text && <p className="text-azul-primario font-medium">{text}</p>}
        </div>
    );
}

interface FullPageLoaderProps {
    text?: string;
}

export function FullPageLoader({ text = 'Cargando...' }: FullPageLoaderProps) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Loader size="lg" text={text} />
        </div>
    );
}
