/**
 * Types for Financial Settings feature
 */

export interface FinancialSettings {
    id: string;
    lawyerCommissionPercentage: number;
    operationalCostsPercentage: number;
    taxPercentage: number;
    platformFeePercentage: number;
    simulationBase: number;
    usdPenFallbackRate?: number | null;
    whatsappPhone?: string;
    updatedAt: string;
    updatedBy?: string;
}

export interface UpdateFinancialSettingsRequest {
    lawyerCommissionPercentage?: number;
    operationalCostsPercentage?: number;
    taxPercentage?: number;
    platformFeePercentage?: number;
    simulationBase?: number;
    usdPenFallbackRate?: number | null;
    whatsappPhone?: string;
}

export interface FinancialCalculation {
    totalRevenue: number;
    lawyerPayments: number;
    operationalCosts: number;
    netProfit: number;
    profitMargin: number;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}
