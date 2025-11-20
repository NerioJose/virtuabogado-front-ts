'use client';

/**
 * Componente Card con compound pattern
 */

import { cn } from '@/shared/utils/cn';

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

export function Card({ children, className }: CardProps) {
    return (
        <div
            className={cn(
                'rounded-xl shadow-md bg-white overflow-hidden',
                className
            )}>
            {children}
        </div>
    );
}

interface CardHeaderProps {
    children: React.ReactNode;
    className?: string;
}

Card.Header = function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
            {children}
        </div>
    );
};

interface CardBodyProps {
    children: React.ReactNode;
    className?: string;
}

Card.Body = function CardBody({ children, className }: CardBodyProps) {
    return <div className={cn('px-6 py-4', className)}>{children}</div>;
};

interface CardFooterProps {
    children: React.ReactNode;
    className?: string;
}

Card.Footer = function CardFooter({ children, className }: CardFooterProps) {
    return (
        <div className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50', className)}>
            {children}
        </div>
    );
};
