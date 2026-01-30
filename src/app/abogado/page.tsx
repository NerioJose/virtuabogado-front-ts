'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AbogadoPanel from '@/components/abogado/AbogadoPanel';
import { useAuthStore } from '@/features/auth/store/authStore';
import { UserRole } from '@/shared/types/entities.types';

export default function AbogadoPage() {
	const router = useRouter();
	const { user, isAuthenticated, checkAuth } = useAuthStore();

	// Verificar autenticación y rol de abogado
	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	useEffect(() => {
		if (!isAuthenticated && user === null) {
			router.push('/login');
		} else if (user && user.rol !== UserRole.ABOGADO) {
			console.error('No autorizado');
			router.push('/login');
		}
	}, [isAuthenticated, user, router]);

	if (!isAuthenticated || !user) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-100">
				<div className="text-center">
					<div className="w-16 h-16 border-4 border-azul-primario border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
					<p className="text-azul-primario font-medium">
						Cargando panel de abogado...
					</p>
				</div>
			</div>
		);
	}

	return <AbogadoPanel abogadoId={user.id} />;
}
