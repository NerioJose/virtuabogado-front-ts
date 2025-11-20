'use client';

import { useAuthGuard } from '@/features/auth/hooks/useAuthGuard';
import { UserRole } from '@/shared/types/entities.types';
import { FullPageLoader } from '@/shared/components/feedback/Loader';
import AbogadoPanel from '@/components/abogado/AbogadoPanel';

export default function AbogadoPage() {
  const { user, isLoading } = useAuthGuard({
    requiredRole: UserRole.ABOGADO,
  });

  if (isLoading || !user) {
    return <FullPageLoader text="Cargando panel de abogado..." />;
  }

  return <AbogadoPanel abogadoId={user.id} />;
}