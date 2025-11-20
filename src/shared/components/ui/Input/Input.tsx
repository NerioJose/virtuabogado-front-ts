'use client';

/**
 * Componente Input reutilizable con estados de error
 */

import { cn } from '@/shared/utils/cn';
import { forwardRef } from 'react';

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-700 mb-2">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={cn(
                        'block w-full rounded-lg border px-3 py-2 shadow-sm transition-colors',
                        'focus:outline-none focus:ring-2',
                        error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                            : 'border-gray-300 focus:border-azul-primario focus:ring-azul-primario/20',
                        'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
                        className
                    )}
                    {...props}
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
                {helperText && !error && (
                    <p className="mt-1 text-sm text-gray-500">{helperText}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
