'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AbogadoPanel from '@/components/abogado/AbogadoPanel';
import { Abogado } from '@/types';

export default function AbogadoPage() {
	const router = useRouter();
	const [user, setUser] = useState<Abogado | null>(null);
	const [loading, setLoading] = useState(true);

	// Verificar autenticación y rol de abogado
	useEffect(() => {
		const verificarAbogado = async () => {
			try {
				// Para propósitos de prueba, verificamos los datos simulados en localStorage
				const userDataString = localStorage.getItem('user');

				if (!userDataString) {
					throw new Error('No autenticado');
				}

				const userData: Abogado = JSON.parse(userDataString);

				if (userData.role !== 'abogado') {
					throw new Error('No autorizado');
				}

				setUser(userData);
				setLoading(false);
			} catch (error) {
				console.error('Error de autenticación:', error);
				router.push('/login');
			}
		};

		verificarAbogado();
	}, [router]);

	if (loading) {
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

	return <AbogadoPanel abogadoId={user!.id} />;
}
