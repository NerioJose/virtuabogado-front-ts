import { useState, useRef } from 'react';
import {
    useAdminServices,
    useUpdateService,
    useCreateService
} from '@/features/services/hooks/useServices';
import { Service, CreateServiceRequest } from '@/features/services/types/services.types';
import { toast } from 'sonner';
import { slugify } from '@/utils/formatters';
import { useExchangeRate } from '@/features/finance/hooks/useExchangeRate';
import { usdToPen, penToUsd, roundMoney } from '@/lib/money';

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

    // Anti-drift: el PEN canónico (60) se recuerda al alternar a US$ y se restaura
    // exacto al volver, evitando el artefacto round-trip 60 → 17.65 → 60.01.
    const penBaseRef = useRef<number | null>(null);
    const usdPreviewRef = useRef<number | null>(null);

    const resetForm = () => {
        setEditingId(null);
        setIsCreating(false);
        setEditForm({});
        setPrecioMode('USD');
        penBaseRef.current = null;
        usdPreviewRef.current = null;
    };

    const handleEdit = (service: Service) => {
        setEditingId(service.id);
        setIsCreating(false);
        const penFixed = service.precioPen != null && Number(service.precioPen) > 0;
        setEditForm({
            titulo: service.titulo,
            descripcion: service.descripcion,
            precio: penFixed ? Number(service.precioPen) : service.precio,
            activo: service.activo,
            imagenUrl: service.imagenUrl || ''
        });
        setPrecioMode(penFixed ? 'PEN' : 'USD');
        penBaseRef.current = penFixed ? Number(service.precioPen) : null;
        usdPreviewRef.current = null;
    };

    const handleCancel = () => {
        resetForm();
    };

    // Alterna la moneda de entrada CONVIRTIENDO el valor mostrado, pero sin perder
    // el PEN canónico: al volver de US$→S/ con el campo sin editar se restaura el
    // valor exacto (60), nunca el derivado (60.01).
    const switchPrecioMode = (next: PrecioMode) => {
        if (next === precioMode) return;
        const raw = roundMoney(Number(editForm.precio) || 0);
        if (precioMode === 'PEN') {
            // S/ → US$: se recuerda el PEN exacto y se muestra su equivalente en dólares.
            penBaseRef.current = raw;
            const usd = penToUsd(raw, rate ?? 0);
            usdPreviewRef.current = usd;
            setEditForm(f => ({ ...f, precio: usd }));
        } else {
            // US$ → S/: si el campo no se editó, se restaura el PEN canónico exacto.
            const unedited = usdPreviewRef.current != null && raw === roundMoney(usdPreviewRef.current);
            const restored = unedited && penBaseRef.current != null ? penBaseRef.current : usdToPen(raw, rate ?? 0);
            setEditForm(f => ({ ...f, precio: restored }));
        }
        setPrecioMode(next);
    };

    // Resuelve el guardado: USD canónico (precio) + PEN exacto (precioPen) cuando se carga en soles.
    const resolvePrecio = (raw: number): { precio: number; precioPen: number | null } => {
        if (precioMode === 'PEN') {
            if (!rate || rate <= 0) {
                toast.error('No hay tasa de cambio disponible para convertir el precio.');
                throw new Error('Tasa no disponible');
            }
            return { precio: penToUsd(raw, rate), precioPen: roundMoney(raw) };
        }
        // USD canónico: si el servicio tenía un PEN canónico y el campo no se editó
        // (round-trip S/→US$→S/ por el toggle), conservar el precioPen exacto para
        // no anularlo al guardar sin cambios reales y no reintroducir el .01.
        const previous = editingId != null ? services?.find(s => s.id === editingId) : null;
        const hasCanonicalPen = previous?.precioPen != null && Number(previous.precioPen) > 0;
        const uneditedUsd = previous != null && Math.abs(raw - Number(previous.precio)) < 1e-9;
        if (hasCanonicalPen && uneditedUsd) {
            return { precio: raw, precioPen: Number(previous.precioPen) };
        }
        return { precio: raw, precioPen: null };
    };

    const handleSave = async () => {
        if (!editingId) return;
        const serviceName = editForm.titulo || 'Servicio';

        let resolved: { precio: number; precioPen: number | null };
        try {
            resolved = resolvePrecio(Number(editForm.precio) || 0);
        } catch {
            return;
        }

        toast.promise(
            updateService.mutateAsync({
                id: editingId,
                titulo: editForm.titulo,
                descripcion: editForm.descripcion,
                precio: resolved.precio,
                precioPen: resolved.precioPen,
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

        let resolved: { precio: number; precioPen: number | null };
        try {
            resolved = resolvePrecio(Number(editForm.precio) || 0);
        } catch {
            return;
        }

        const serviceName = editForm.titulo.trim();
        const payload: CreateServiceRequest = {
            titulo: serviceName,
            descripcion: editForm.descripcion?.trim() || '',
            precio: resolved.precio,
            precioPen: resolved.precioPen,
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
        switchPrecioMode,
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