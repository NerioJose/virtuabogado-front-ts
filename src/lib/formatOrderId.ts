/**
 * Formato único de ID de Expediente: EXP-2026-05-00042
 * Mismo formato en TODA la plataforma (admin, abogado, cliente, notificaciones).
 */
export function formatOrderId(
	numericId?: number | null,
	createdAt?: string | Date | null,
): string {
	if (!numericId) return 'EXP-00000';

	const date = createdAt ? new Date(createdAt) : new Date();
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');

	return `EXP-${year}-${month}-${String(numericId).padStart(5, '0')}`;
}
