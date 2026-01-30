import { useState, useEffect, useCallback } from 'react';
import type { Abogado, Estadisticas, UseAbogadoDataReturn } from '../types';

export function useAbogadoData(abogadoId?: string): UseAbogadoDataReturn {
	const [abogado, setAbogado] = useState<Abogado | null>(null);
	const [loading, setLoading] = useState(true);
	const [estadisticas, setEstadisticas] = useState<Estadisticas>({
		casosActivos: 0,
		casosPendientes: 0,
		casosCompletados: 0,
		clientesActivos: 0,
		proximaCita: '',
		ingresosMes: 0,
	});

	const cargarDatosAbogado = useCallback(async () => {
		try {
			setLoading(true);
			await new Promise((resolve) => setTimeout(resolve, 1000));

			setAbogado({
				id: abogadoId || '1',
				nombre: 'Carlos Méndez',
				email: 'carlos.mendez@ejemplo.com',
				telefono: '+34 612 345 678',
				especialidad: 'Derecho Civil',
				numeroColegiado: 'AB12345',
				experienciaAnios: 8,
				valoracionMedia: 4.8,
			});

			setEstadisticas({
				casosActivos: 12,
				casosPendientes: 3,
				casosCompletados: 45,
				clientesActivos: 18,
				proximaCita: '2023-06-20 10:00',
				ingresosMes: 2500,
			});

			setLoading(false);
		} catch (error) {
			console.error('Error al cargar datos del abogado:', error);
			setLoading(false);
		}
	}, [abogadoId]);

	useEffect(() => {
		cargarDatosAbogado();
	}, [cargarDatosAbogado]);

	return { abogado, estadisticas, loading };
}
