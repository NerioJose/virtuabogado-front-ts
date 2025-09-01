import { ReactNode } from 'react';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function PrimaryButton({ children, onClick, className = '' }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn-primary ${className} transition-all hover:scale-105 active:scale-95`}
    >
      {children}
    </button>
  );
}