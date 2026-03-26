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
        }

        if (settings.taxPercentage !== undefined) {
            if (settings.taxPercentage < 0 || settings.taxPercentage > 100) {
                errors.push('Los impuestos deben estar entre 0% y 100%');
            }
        }

        if (settings.platformFeePercentage !== undefined) {
            if (settings.platformFeePercentage < 0 || settings.platformFeePercentage > 100) {
                errors.push('La comisión de plataforma debe estar entre 0% y 100%');
            }
        }

        // Validar que la suma no exceda el 100%
        const lawyerCommission = settings.lawyerCommissionPercentage ?? 70;
        const operationalCosts = settings.operationalCostsPercentage ?? 10;
        const tax = settings.taxPercentage ?? 15;
        const platform = settings.platformFeePercentage ?? 5;
        const totalCosts = lawyerCommission + operationalCosts + tax + platform;

        if (totalCosts > 100) {
            errors.push(`La suma total de porcentajes (${totalCosts}%) no puede exceder el 100%`);
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
        operationalCostsPercentage: number,
        taxPercentage: number,
        platformFeePercentage: number
    ) {
        const lawyerPayments = (totalRevenue * lawyerCommissionPercentage) / 100;
        const operationalCosts = (totalRevenue * operationalCostsPercentage) / 100;
        const taxSurcharge = (totalRevenue * taxPercentage) / 100;
        const platformFee = (totalRevenue * platformFeePercentage) / 100;
        
        const netProfit = totalRevenue - lawyerPayments - operationalCosts - taxSurcharge - platformFee;
        const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            lawyerPayments,
            operationalCosts: operationalCosts + taxSurcharge + platformFee,
            netProfit,
            profitMargin,
        };
    }
}

export const financialSettingsService = new FinancialSettingsService();
