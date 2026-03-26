'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Abogado, Estadisticas, UseAbogadoDataReturn } from '../types';
import { getFinancialSummary } from '@/features/finance/actions/getFinancialSummary';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Hook Profesionalizado para el Abogado.
 * Consume datos reales del servidor con blindaje financiero.
 */
export function useAbogadoData(abogadoId?: string): UseAbogadoDataReturn {
	const user = useAuthStore(state => state.user);
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

	const cargarDatosReales = useCallback(async () => {
		if (!user || user.rol !== 'ABOGADO') {
			setLoading(false);
			return;
		}

		try {
			setLoading(true);
			
			// 1. Cargar Perfil (Mapping de Supabase User a Tipo Abogado)
			setAbogado({
				id: user.id,
				nombre: user.user_metadata?.nombre || 'Abogado',
				email: user.email || '',
				telefono: user.user_metadata?.telefono || '-',
				especialidad: user.user_metadata?.especialidad || 'Consultor Legal',
				numeroColegiado: user.user_metadata?.numeroColegiado || 'N/A',
				experienciaAnios: 0,
				valoracionMedia: 5.0,
			});

			// 2. Cargar Estadísticas Financieras Reales
			const summary = await getFinancialSummary(
				{ lawyerId: user.id, dateRange: 'month' },
				{ id: user.id, rol: 'ABOGADO' as any }
			);

			setEstadisticas({
				casosActivos: summary.transactionCount || 0, // Ajustar según lógica de negocio si es necesario
				casosPendientes: 0, 
				casosCompletados: summary.transactionCount || 0,
				clientesActivos: 0, // Placeholder hasta tener conteo real
				proximaCita: new Date().toISOString(),
				ingresosMes: summary.lawyerPendingBalance || 0, // BALANCE REAL DEL ABOGADO
			});

			setLoading(false);
		} catch (error) {
			console.error('❌ Error al cargar datos reales del abogado:', error);
			setLoading(false);
		}
	}, [user]);

	useEffect(() => {
		cargarDatosReales();
	}, [cargarDatosReales]);

	return { abogado, estadisticas, loading };
}
