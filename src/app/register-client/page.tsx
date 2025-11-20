import { RegisterForm } from '@/features/auth/components/RegisterForm';
import { UserRole } from '@/shared/types/entities.types';

export default function RegisterClientPage() {
  return <RegisterForm defaultRole={UserRole.CLIENTE} />;
}