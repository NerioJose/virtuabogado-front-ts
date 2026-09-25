import { useState } from 'react';
import {
    useAdminServices,
    useUpdateService,
    useCreateService
} from '@/features/services/hooks/useServices';
import { Service, CreateServiceRequest } from '@/features/services/types/services.types';
import { toast } from 'sonner';
import { slugify } from '@/utils/formatters';
import { useExchangeRate } from '@/features/finance/hooks/useExchangeRate';
import { penToUsd } from '@/lib/finance';

export type PrecioMode = 'USD' | 'PEN';

export function useServiciosPanel() {
    const { data: services, isLoading, error } = useAdminServices();
    const updateService = useUpdateService();
    const createService = useCreateService();
    const { rate } = useExchangeRate();

    const [editingId, setEditingId] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Service>>({});
    const [precioMode, setPrecioMode] = useState<PrecioMode>('USD');

    const resetForm = () => {
        setEditingId(null);
        setIsCreating(false);
        setEditForm({});
        setPrecioMode('USD');
    };

    const handleEdit = (service: Service) => {
        setEditingId(service.id);
        setIsCreating(false);
        setEditForm({
            titulo: service.titulo,
            descripcion: service.descripcion,
            precio: service.precio,
            activo: service.activo,
            imagenUrl: service.imagenUrl || ''
        });
        setPrecioMode('USD');
    };

    const handleCancel = () => {
        resetForm();
    };

    // Convierte el precio tipeado al canónico en USD si el modo es PEN.
    const resolvePrecio = (raw: number): number => {
        if (precioMode === 'PEN') {
            if (!rate || rate <= 0) {
                toast.error('No hay tasa de cambio disponible para convertir el precio.');
                throw new Error('Tasa no disponible');
            }
            return penToUsd(raw, rate);
        }
        return raw;
    };

    const handleSave = async () => {
        if (!editingId) return;
        const serviceName = editForm.titulo || 'Servicio';

        let finalPrecio: number;
        try {
            finalPrecio = resolvePrecio(Number(editForm.precio) || 0);
        } catch {
            return;
        }

        toast.promise(
            updateService.mutateAsync({
                id: editingId,
                titulo: editForm.titulo,
                descripcion: editForm.descripcion,
                precio: finalPrecio,
                activo: editForm.activo,
                imagenUrl: editForm.imagenUrl || undefined
            }),
            {
                loading: `Guardando cambios en "${serviceName}"...`,
                success: `✅ "${serviceName}" actualizado correctamente.`,
                error: (e) => `❌ Error al guardar: ${e?.message || 'Intenta de nuevo'}`,
            }
        );
        resetForm();
    };

    const startCreate = () => {
        resetForm();
        setIsCreating(true);
        setEditForm({
            titulo: '',
            descripcion: '',
            precio: 0,
            activo: true,
            imagenUrl: ''
        });
        setPrecioMode('USD');
    };

    const handleCreate = async () => {
        if (!editForm.titulo?.trim()) {
            toast.error('Ingresá un título para el servicio.');
            return;
        }

        let finalPrecio: number;
        try {
            finalPrecio = resolvePrecio(Number(editForm.precio) || 0);
        } catch {
            return;
        }

        const serviceName = editForm.titulo.trim();
        const payload: CreateServiceRequest = {
            titulo: serviceName,
            descripcion: editForm.descripcion?.trim() || '',
            precio: finalPrecio,
            activo: editForm.activo ?? true,
            imagenUrl: editForm.imagenUrl?.trim() || undefined,
        };

        toast.promise(
            createService.mutateAsync(payload),
            {
                loading: `Creando servicio "${serviceName}"...`,
                success: `✅ "${serviceName}" creado correctamente.`,
                error: (e) => `❌ Error al crear: ${e?.message || 'Intenta de nuevo'}`,
            }
        );
        resetForm();
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
        isCreating,
        editForm,
        setEditForm,
        precioMode,
        setPrecioMode,
        rate,
        handleEdit,
        handleCancel,
        handleSave,
        startCreate,
        handleCreate,
        toggleStatus,
        getServiceImage,
        isUpdating: updateService.isPending
    };
}