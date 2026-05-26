import { useState, useEffect, useCallback } from 'react';
import { Abogado, Cliente, Caso, Transaccion } from '@/types/index';

type ElementoModal = Abogado | Cliente | Caso | Transaccion;

export type FormDataType = Record<
  string,
  string | number | boolean | Date | null | undefined
>;

export type CampoFormulario = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  readonly?: boolean;
};

// Helper function moved to the hook or exported for use
export const obtenerCamposPorSeccion = (seccion: string, tipo: string): CampoFormulario[] => {
  // Dashboard usa los mismos campos que Casos
  const effectiveSeccion = seccion === 'dashboard' ? 'casos' : seccion;
  switch (effectiveSeccion) {
    case 'abogados':
      return [
        { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'telefono', label: 'Teléfono', type: 'tel', required: false },
        { key: 'especialidad', label: 'Especialidad', type: 'text', required: true },
        { key: 'matricula', label: 'Número de colegiatura', type: 'text', required: false },
        ...(tipo === 'editar' ? [
          { key: 'status', label: 'Estado de la cuenta', type: 'select', options: ['ACTIVO', 'INACTIVO'], required: true }
        ] : []),
        ...(tipo === 'crear' ? [
          { key: 'password', label: 'Contraseña inicial', type: 'password', required: true }
        ] : [])
      ];
    case 'clientes':
      return [
        { key: 'nombre', label: 'Nombre completo', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'telefono', label: 'Teléfono', type: 'tel', required: true },
        { key: 'direccion', label: 'Dirección', type: 'text', required: false },
        { key: 'dni', label: 'DNI/RUC', type: 'text', required: false },
        ...(tipo === 'editar' ? [
          { key: 'status', label: 'Estado de la cuenta', type: 'select', options: ['ACTIVO', 'INACTIVO'], required: true }
        ] : []),
        ...(tipo === 'crear' ? [
          { key: 'password', label: 'Contraseña inicial', type: 'password', required: true }
        ] : [])
      ];
    case 'casos':
      return [
        { key: 'numericId', label: 'ID de Orden', type: 'number', required: false, readonly: true },
        { key: 'userName', label: 'Cliente', type: 'text', required: false, readonly: true },
        { key: 'status', label: 'Estado', type: 'select', options: ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'], required: true },
        { key: 'total', label: 'Monto Total', type: 'number', required: false, readonly: true },
        { key: 'createdAt', label: 'Fecha de Creación', type: 'date', required: false, readonly: true },
      ];
    case 'finanzas':
      return [
        { key: 'numericId', label: 'ID de Transacción', type: 'number', required: false, readonly: true },
        { key: 'userName', label: 'Cliente', type: 'text', required: false, readonly: true },
        { key: 'total', label: 'Monto Total', type: 'number', required: false, readonly: true },
        { key: 'status', label: 'Estado de Orden', type: 'select', options: ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADO', 'CANCELADO'], required: true, readonly: true },
        { key: 'createdAt', label: 'Fecha', type: 'date', required: false, readonly: true },
      ];
    default:
      return [];
  }
};

export function useModalContainer(
  tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar',
  seccion: 'abogados' | 'clientes' | 'casos' | 'finanzas' | 'configuracion',
  elemento: ElementoModal | null,
  onClose: () => void,
  onSave?: (data: FormDataType) => Promise<void> | void
) {
  const [formData, setFormData] = useState<FormDataType>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (elemento && (tipo === 'editar' || tipo === 'ver' || tipo === 'eliminar' || tipo === 'asignar')) {
      const initialForm: any = { ...elemento };
      const campos = obtenerCamposPorSeccion(seccion, tipo);
      campos.forEach(campo => {
        if (campo.type === 'date' && initialForm[campo.key]) {
          try {
            const date = new Date(initialForm[campo.key]);
            if (!isNaN(date.getTime())) {
              initialForm[campo.key] = date.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn(`Error formatting date for field ${campo.key}:`, e);
          }
        }
      });
      setFormData(initialForm);
    } else if (tipo === 'crear') {
      const campos = obtenerCamposPorSeccion(seccion, tipo);
      const initialData: FormDataType = {};
      campos.forEach((campo) => {
        initialData[campo.key] = campo.type === 'number' ? 0 : '';
      });
      setFormData(initialData);
    }
  }, [elemento, tipo, seccion]);

  const handleInputChange = useCallback((key: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const validateForm = useCallback((): boolean => {
    const campos = obtenerCamposPorSeccion(seccion, tipo);
    const errors: Record<string, string> = {};

    if (tipo === 'asignar') {
      if (!formData.lawyerId) {
        errors.lawyerId = 'Debe seleccionar un abogado';
      }
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    }

    campos.forEach((campo) => {
      if (campo.required) {
        const value = formData[campo.key];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          errors[campo.key] = `${campo.label} es obligatorio`;
        }
      }

      if (campo.type === 'email' && formData[campo.key]) {
        const email = formData[campo.key] as string;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors[campo.key] = 'Formato de email inválido';
        }
      }

      if (campo.type === 'number' && formData[campo.key] !== undefined) {
        const value = Number(formData[campo.key]);
        if (isNaN(value) || value < 0) {
          errors[campo.key] = 'Debe ser un número válido mayor o igual a 0';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, seccion, tipo]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (tipo === 'ver') return;

    if (!validateForm()) {
      setError('Por favor, corrige los errores en el formulario');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const finalData = { ...formData };
      if (finalData.status === 'ACTIVO') finalData.activo = true;
      if (finalData.status === 'INACTIVO') finalData.activo = false;
      if (finalData.status === 'active') finalData.activo = true;
      if (finalData.status === 'inactive') finalData.activo = false;

      if (onSave) {
        await onSave(finalData);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const confirmarEliminacion = async () => {
    setLoading(true);
    setError('');

    try {
      if (onSave) {
        await onSave({ id: elemento?.id });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ocurrió un error al eliminar.');
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    loading,
    error,
    success,
    validationErrors,
    handleInputChange,
    handleSubmit,
    confirmarEliminacion,
    campos: obtenerCamposPorSeccion(seccion, tipo),
  };
}
