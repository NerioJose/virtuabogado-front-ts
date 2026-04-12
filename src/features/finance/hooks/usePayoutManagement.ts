import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
    getPendingPayoutsSummary, 
    createPayout, 
    finalizePayout, 
    getPayoutHistory 
} from '@/features/finance/actions/payoutActions';

export const usePayoutManagement = () => {
    const queryClient = useQueryClient();

    // UI States
    const [isProcessing, setIsProcessing] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [reference, setReference] = useState('');
    const [actionType, setActionType] = useState<'create' | 'finalize'>('create');
    const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
    const [selectedLawyer, setSelectedLawyer] = useState<any | null>(null);

    // Queries
    const { data: pending = [], isLoading: loadingPending, refetch: refetchPending } = useQuery({
        queryKey: ['PendingPayouts'],
        queryFn: getPendingPayoutsSummary
    });

    const { data: history = [] as any[], isLoading: loadingHistory, refetch: refetchHistory } = useQuery({
        queryKey: ['PayoutHistory'],
        queryFn: () => getPayoutHistory()
    });

    const handleCreatePayout = async (lawyer: any) => {
        setIsProcessing(true);
        try {
            const res = await createPayout({
                lawyerId: lawyer.lawyer.id,
                orderIds: lawyer.orderIds,
                amount: lawyer.totalPending,
                method: 'Transferencia Bancaria',
                notes: `Pago por ${lawyer.orderCount} casos completados.`
            });
            if (res.success) {
                // Invalidate all financial and history queries
                queryClient.invalidateQueries({ queryKey: ['Order'] });
                queryClient.invalidateQueries({ queryKey: ['Finance'] });
                queryClient.invalidateQueries({ queryKey: ['PayoutHistory'] });
                
                // Refresh local data
                refetchPending();
                refetchHistory();
            }
        } catch (error) {
            console.error('Error creating payout:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFinalize = (payout: any) => {
        setSelectedPayoutId(payout.id);
        setSelectedLawyer(payout);
        setActionType('finalize');
        setShowModal(true);
    };

    const confirmFinalize = async () => {
        if (!reference || !selectedPayoutId) return;
        setIsProcessing(true);
        try {
            const res = await finalizePayout(selectedPayoutId, reference);
            if (res.success) {
                setReference('');
                setShowModal(false);
                setSelectedLawyer(null);
                
                // Invalidate all financial and history queries
                queryClient.invalidateQueries({ queryKey: ['Order'] });
                queryClient.invalidateQueries({ queryKey: ['Finance'] });
                queryClient.invalidateQueries({ queryKey: ['PayoutHistory'] });
                
                // Refresh local data
                refetchPending();
                refetchHistory();
            }
        } catch (error) {
            console.error('Error finalizing payout:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setReference('');
        setSelectedLawyer(null);
    };

    return {
        // Data
        pending,
        history,
        loadingPending,
        loadingHistory,
        
        // Modal State
        showModal,
        closeModal,
        reference,
        setReference,
        actionType,
        selectedLawyer,
        isProcessing,

        // Actions
        handleCreatePayout,
        handleFinalize,
        confirmFinalize
    };
};
