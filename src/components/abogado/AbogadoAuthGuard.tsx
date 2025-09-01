import { ReactNode } from 'react';

// Interfaz para el usuario abogado
interface AbogadoUser {
  id: number;
  name: string;
  email: string;
  role: 'abogado';
  picture?: string;
}

interface AbogadoAuthGuardProps {
  user: AbogadoUser | null;
  children: ReactNode;
}

export default function AbogadoAuthGuard({ user, children }: AbogadoAuthGuardProps) {
  if (!user) {
    return null;
  }

  return <>{children}</>;
}