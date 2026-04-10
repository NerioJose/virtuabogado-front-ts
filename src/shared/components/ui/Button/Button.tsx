'use client';
import React from 'react';

/**
 * Componente Button reutilizable con variantes
 */

import { motion } from 'framer-motion';
import { cn } from '@/shared/utils/cn';

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    children: React.ReactNode;
}

const variantStyles = {
    primary:
        'bg-azul-primario text-white hover:bg-azul-primario/90 shadow-md hover:shadow-lg',
    secondary:
        'bg-vinotinto text-white hover:bg-vinotinto/90 shadow-md hover:shadow-lg',
    outline:
        'border-2 border-azul-primario text-azul-primario hover:bg-azul-primario/10',
    ghost: 'text-azul-primario hover:bg-azul-primario/10',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg',
};

const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
};

export function Button({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className,
    children,
    disabled,
    ...props
}: ButtonProps) {
    // Extraer props que pueden causar conflictos de tipo con motion
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { onDrag, onDragStart, onDragEnd, ...restProps } = props as Record<string, unknown>;

    return (
        <motion.button
            whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
            whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
            className={cn(
                'rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2',
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
            disabled={disabled || isLoading}
            {...restProps}>
            {isLoading ? (
                <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cargando...</span>
                </>
            ) : (
                children
            )}
        </motion.button>
    );
}
