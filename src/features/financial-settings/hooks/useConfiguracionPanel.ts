import { useState, useMemo, useEffect } from 'react';
import { useFinancialSettings, useUpdateFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';
import { financialSettingsService } from '@/features/financial-settings/services/financial-settings.service';

export const useConfiguracionPanel = () => {
    const { data: financialSettings, isLoading: loadingSettings } = useFinancialSettings();
    const updateSettings = useUpdateFinancialSettings();

    const [simulationBase, setSimulationBase] = useState<number>(0);
    const [lawyerCommission, setLawyerCommission] = useState<number>(0);
    const [operationalCosts, setOperationalCosts] = useState<number>(0);
    const [taxPercentage, setTaxPercentage] = useState<number>(0);
    const [platformFee, setPlatformFee] = useState<number>(0);
    const [whatsappPhone, setWhatsappPhone] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        if (financialSettings) {
            setLawyerCommission((financialSettings as any).lawyerCommissionPercentage || 0);
            setOperationalCosts((financialSettings as any).operationalCostsPercentage || 0);
            setTaxPercentage((financialSettings as any).taxPercentage || 0);
            setPlatformFee((financialSettings as any).platformFeePercentage || 0);
            setSimulationBase((financialSettings as any).simulationBase || 0);
            setWhatsappPhone((financialSettings as any).whatsappPhone || '');
        }
    }, [financialSettings]);

    const validation = useMemo(() => {
        return financialSettingsService.validateSettings({
            lawyerCommissionPercentage: lawyerCommission,
            operationalCostsPercentage: operationalCosts,
            taxPercentage: taxPercentage,
            platformFeePercentage: platformFee,
            simulationBase: simulationBase,
            whatsappPhone: whatsappPhone
        });
    }, [lawyerCommission, operationalCosts, taxPercentage, platformFee, simulationBase, whatsappPhone]);

    const previewData = useMemo(() => {
        return financialSettingsService.calculatePreview(
            simulationBase,
            lawyerCommission,
            operationalCosts,
            taxPercentage,
            platformFee
        );
    }, [simulationBase, lawyerCommission, operationalCosts, taxPercentage, platformFee]);

    const handleSave = async () => {
        if (!validation.isValid) return;
        setIsSaving(true);
        setSaveMessage('');

        try {
            await updateSettings.mutateAsync({
                lawyerCommissionPercentage: lawyerCommission,
                operationalCostsPercentage: operationalCosts,
                taxPercentage: taxPercentage,
                platformFeePercentage: platformFee,
                simulationBase: simulationBase,
                whatsappPhone: whatsappPhone
            });
            setSaveMessage('Configuración financiera guardada correctamente');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            console.error('Error saving financial settings:', error);
            setSaveMessage('Error al guardar la configuración');
        } finally {
            setIsSaving(false);
        }
    };

    return {
        // State actions
        simulationBase, setSimulationBase,
        lawyerCommission, setLawyerCommission,
        operationalCosts, setOperationalCosts,
        taxPercentage, setTaxPercentage,
        platformFee, setPlatformFee,
        whatsappPhone, setWhatsappPhone,
        // UI feedback states
        isSaving,
        saveMessage,
        loadingSettings,
        // Computed data
        validation,
        previewData,
        // Core functionality
        handleSave
    };
};
