import { useState } from 'react';
import { usePaymentMethods } from '@/features/checkout/hooks/usePaymentMethods';
import { 
    togglePaymentMethodAction, 
    createPaymentMethodAction, 
    updatePaymentMethodAction, 
    deletePaymentMethodAction 
} from '@/features/checkout/actions/paymentMethods';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useMetodosPagoPanel() {
    const { data: methods, isLoading } = usePaymentMethods(true);
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<any>(null);
    const [formData, setFormData] = useState({
        identifier: '',
        name: '',
        isActive: false,
        icon: 'FiCreditCard'
    });

    const handleToggle = async (id: string, currentStatus: boolean) => {
        const loadingToast = toast.loading('Actualizando estado...');
        try {
            const result = await togglePaymentMethodAction(id, !currentStatus);
            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: ['PaymentMethod'] });
                toast.success('Estado actualizado correctamente', { id: loadingToast });
            } else {
                toast.error(result.message || 'Error al actualizar', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Error de conexión', { id: loadingToast });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta pasarela? El historial de órdenes se mantendrá pero la pasarela desaparecerá del listado.')) return;
        
        const loadingToast = toast.loading('Eliminando configuración...');
        try {
            const result = await deletePaymentMethodAction(id);
            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: ['PaymentMethod'] });
                toast.success('Configuración eliminada', { id: loadingToast });
            } else {
                toast.error(result.message || 'Error al eliminar', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Error de conexión', { id: loadingToast });
        }
    };

    const openCreateModal = () => {
        setEditingMethod(null);
        setFormData({ identifier: '', name: '', isActive: true, icon: 'FiCreditCard' });
        setIsModalOpen(true);
    };

    const openEditModal = (method: any) => {
        setEditingMethod(method);
        setFormData({
            identifier: method.identifier,
            name: method.name,
            isActive: method.isActive,
            icon: method.icon || 'FiCreditCard'
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadingToast = toast.loading('Guardando configuración...');

        try {
            let result;
            if (editingMethod) {
                result = await updatePaymentMethodAction(editingMethod.id, {
                    name: formData.name,
                    isActive: formData.isActive,
                    icon: formData.icon
                });
            } else {
                result = await createPaymentMethodAction({
                    identifier: formData.identifier,
                    name: formData.name,
                    isActive: formData.isActive,
                    icon: formData.icon
                });
            }

            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: ['PaymentMethod'] });
                toast.success('Configuración guardada', { id: loadingToast });
                setIsModalOpen(false);
            } else {
                toast.error(result.message || 'Error al guardar', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Error de comunicación', { id: loadingToast });
        }
    };

    return {
        methods,
        isLoading,
        isModalOpen,
        setIsModalOpen,
        editingMethod,
        formData,
        setFormData,
        handleToggle,
        handleDelete,
        openCreateModal,
        openEditModal,
        handleSave,
    };
}
