'use client';

import { useState } from 'react';
import AbogadoSidebar from './AbogadoSidebar';
import AbogadoMainContent from './AbogadoMainContent';
import { useAbogadoData } from '@/hooks/useAbogadoData';
import { SeccionAbogado } from '@/types/index';

interface AbogadoLayoutProps {
	abogadoId: string;
}

export default function AbogadoLayout({ abogadoId }: AbogadoLayoutProps) {
	const [seccionActiva, setSeccionActiva] = useState<SeccionAbogado>('casos');
	const { abogado, estadisticas, loading } = useAbogadoData(abogadoId);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-gray-100">
			<AbogadoSidebar
				abogado={abogado}
				seccionActiva={seccionActiva}
				onSeccionChange={setSeccionActiva}
			/>
			<AbogadoMainContent
				seccionActiva={seccionActiva}
				abogado={abogado}
				estadisticas={estadisticas}
			/>
		</div>
	);
}
