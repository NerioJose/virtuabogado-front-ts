'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Abogado, Estadisticas, UseAbogadoDataReturn } from '../types';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useAuthStore } from '@/features/auth/store/authStore';

export function useAbogadoData(abogadoId?: string): UseAbogadoDataReturn {
	const user = useAuthStore(state => state.user);
	const mountedRef = useRef(true);
	const [abogado, setAbogado] = useState<Abogado | null>(null);
	const [loading, setLoading] = useState(true);
	const [estadisticas, setEstadisticas] = useState<Estadisticas>({
		casosActivos: 0,
		casosPendientes: 0,
		casosCompletados: 0,
		clientesActivos: 0,
		proximaCita: new Date().toISOString(),
		ingresosMes: 0,
	});

	useEffect(() => {
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const cargarDatosReales = useCallback(async () => {
		if (!user || user.rol !== 'ABOGADO') {
			if (mountedRef.current) setLoading(false);
			return;
		}

		try {
			if (mountedRef.current) setLoading(true);

			const metadata = (user as any).user_metadata || {};

			if (mountedRef.current) setAbogado({
				id: user.id,
				nombre: metadata.nombre || 'Abogado',
				email: user.email || '',
				telefono: metadata.telefono || '-',
				especialidad: metadata.especialidad || 'Consultor Legal',
				numeroColegiado: metadata.numeroColegiado || 'N/A',
				experienciaAnios: 0,
				valoracionMedia: 5.0,
			});

			const summary = await getFinancialSummary(
				{ lawyerId: user.id, dateRange: 'month' },
				{ id: user.id, rol: 'ABOGADO' as any }
			);

			if (mountedRef.current) setEstadisticas({
				casosActivos: summary.transactionCount || 0,
				casosPendientes: 0,
				casosCompletados: summary.transactionCount || 0,
				clientesActivos: 0,
				proximaCita: new Date().toISOString(),
				ingresosMes: summary.lawyerPendingBalance || 0,
			});

			if (mountedRef.current) setLoading(false);
		} catch (error) {
			console.error('❌ Error al cargar datos reales del abogado:', error);
			if (mountedRef.current) setLoading(false);
		}
	}, [user?.id, user?.rol]);

	useEffect(() => {
		cargarDatosReales();
	}, [cargarDatosReales]);

	return { abogado, estadisticas, loading };
}
