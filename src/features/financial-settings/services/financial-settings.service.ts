import { apiClient } from '@/lib/apiClient';
import {
    FinancialSettings,
    UpdateFinancialSettingsRequest,
    ValidationResult,
} from '../types/financial-settings.types';

class FinancialSettingsService {
    private readonly BASE_URL = '/api/settings/financial';

    /**
     * Obtener la configuración financiera actual
     */
    async get(): Promise<FinancialSettings> {
        // Añadir cache buster para evitar cache agresiva de Next.js/Browser
        const response = await apiClient.get<FinancialSettings>(`${this.BASE_URL}?t=${Date.now()}`);
        return response;
    }

    /**
     * Actualizar la configuración financiera
     */
    async update(data: UpdateFinancialSettingsRequest): Promise<FinancialSettings> {
        const response = await apiClient.patch<FinancialSettings>(this.BASE_URL, data);
        return response;
    }

    /**
     * Validar configuración antes de guardar
     */
    validateSettings(settings: UpdateFinancialSettingsRequest): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Validar rangos (0-100)
        if (settings.lawyerCommissionPercentage !== undefined) {
            if (settings.lawyerCommissionPercentage < 0 || settings.lawyerCommissionPercentage > 100) {
                errors.push('La comisión de abogados debe estar entre 0% y 100%');
            }
            if (settings.lawyerCommissionPercentage < 50) {
                warnings.push('Comisión de abogados muy baja. Podría afectar la motivación.');
            }
        }

        if (settings.operationalCostsPercentage !== undefined) {
            if (settings.operationalCostsPercentage < 0 || settings.operationalCostsPercentage > 100) {
                errors.push('Los gastos operativos deben estar entre 0% y 100%');
            }
            if (settings.operationalCostsPercentage > 30) {
                warnings.push('Gastos operativos altos. Revisar eficiencia operativa.');
            }
        }

        // Validar que la suma sea razonable (dejar margen para ganancia)
        const lawyerCommission = settings.lawyerCommissionPercentage ?? 70;
        const operationalCosts = settings.operationalCostsPercentage ?? 10;
        const totalCosts = lawyerCommission + operationalCosts;

        if (totalCosts > 95) {
            errors.push(`La suma de comisión (${lawyerCommission}%) + gastos (${operationalCosts}%) = ${totalCosts}% deja muy poco margen de ganancia`);
        }

        if (totalCosts > 85 && totalCosts <= 95) {
            warnings.push(`Margen de ganancia bajo: solo ${100 - totalCosts}% queda para la plataforma`);
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }

    /**
     * Calcular preview de métricas financieras
     */
    calculatePreview(
        totalRevenue: number,
        lawyerCommissionPercentage: number,
        operationalCostsPercentage: number
    ) {
        const lawyerPayments = (totalRevenue * lawyerCommissionPercentage) / 100;
        const operationalCosts = (totalRevenue * operationalCostsPercentage) / 100;
        const netProfit = totalRevenue - lawyerPayments - operationalCosts;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            lawyerPayments,
            operationalCosts,
            netProfit,
            profitMargin,
        };
    }
}

export const financialSettingsService = new FinancialSettingsService();
