import { useState } from 'react';
import { 
    useAdminServices, 
    useUpdateService 
} from '@/features/services/hooks/useServices';
import { Service } from '@/features/services/types/services.types';
import { toast } from 'sonner';
import { slugify } from '@/utils/formatters';

export function useServiciosPanel() {
    const { data: services, isLoading, error } = useAdminServices();
    const updateService = useUpdateService();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<Service>>({});

    const handleEdit = (service: Service) => {
        setEditingId(service.id);
        setEditForm({
            titulo: service.titulo,
            descripcion: service.descripcion,
            precio: service.precio,
            activo: service.activo,
            imagenUrl: service.imagenUrl || ''
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async () => {
        if (!editingId) return;
        const serviceName = editForm.titulo || 'Servicio';

        toast.promise(
            updateService.mutateAsync({
                id: editingId,
                titulo: editForm.titulo,
                descripcion: editForm.descripcion,
                precio: Number(editForm.precio),
                activo: editForm.activo,
                imagenUrl: editForm.imagenUrl || undefined
            }),
            {
                loading: `Guardando cambios en "${serviceName}"...`,
                success: `✅ "${serviceName}" actualizado correctamente.`,
                error: (e) => `❌ Error al guardar: ${e?.message || 'Intenta de nuevo'}`,
            }
        );
        setEditingId(null);
    };

    const toggleStatus = async (service: Service) => {
        const newStatus = !service.activo;
        const action = newStatus ? 'activar' : 'desactivar';
        const resultMsg = newStatus
            ? `✅ "${service.titulo}" está ahora VISIBLE para los clientes.`
            : `🔒 "${service.titulo}" está ahora OCULTO.`;

        toast.promise(
            updateService.mutateAsync({
                id: service.id,
                activo: newStatus
            }),
            {
                loading: `${action === 'activar' ? '🟡' : '🔴'} Procesando "${service.titulo}"...`,
                success: resultMsg,
                error: `❌ No se pudo cambiar el estado.`,
            }
        );
    };

    const getServiceImage = (service: Service) => {
        if (service.imagenUrl) return service.imagenUrl;
        return `/images/${slugify(service.titulo)}.jpg`;
    };

    return {
        services,
        isLoading,
        error,
        editingId,
        editForm,
        setEditForm,
        handleEdit,
        handleCancel,
        handleSave,
        toggleStatus,
        getServiceImage,
        isUpdating: updateService.isPending
    };
}
