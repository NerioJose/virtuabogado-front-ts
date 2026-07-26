'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';

interface FormData {
  nombre: string;
  email: string;
  telefono: string;
  asunto: string;
  mensaje: string;
}

interface FormErrors {
  nombre?: string;
  email?: string;
  telefono?: string;
  asunto?: string;
  mensaje?: string;
}

interface FormularioContactoProps {
  onSubmitSuccess?: () => void;
}

// Hook personalizado para debounce
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const FormularioContacto = React.memo(({ onSubmitSuccess }: FormularioContactoProps) => {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    email: '',
    telefono: '',
    asunto: '',
    mensaje: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const mountedRef = useRef(true);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // Debounce para validación en tiempo real
  const debouncedEmail = useDebounce(formData.email, 500);
  const debouncedNombre = useDebounce(formData.nombre, 300);
  const debouncedTelefono = useDebounce(formData.telefono, 300);

  const validateField = useCallback((fieldName: keyof FormData, value: string): string | undefined => {
    switch (fieldName) {
      case 'nombre':
        return !value.trim() ? 'El nombre es requerido' : undefined;
      case 'email':
        if (!value.trim()) return 'El correo electrónico es requerido';
        return !/\S+@\S+\.\S+/.test(value) ? 'El correo electrónico no es válido' : undefined;
      case 'telefono':
        return !value.trim() ? 'El teléfono es requerido' : undefined;
      case 'asunto':
        return !value ? 'El asunto es requerido' : undefined;
      case 'mensaje':
        return !value.trim() ? 'El mensaje es requerido' : undefined;
      default:
        return undefined;
    }
  }, []);

  // Validación en tiempo real con debounce
  useEffect(() => {
    if (debouncedEmail && formData.email) {
      const emailError = validateField('email', debouncedEmail);
      setErrors(prev => ({ ...prev, email: emailError }));
    }
  }, [debouncedEmail, formData.email, validateField]);

  useEffect(() => {
    if (debouncedNombre && formData.nombre) {
      const nombreError = validateField('nombre', debouncedNombre);
      setErrors(prev => ({ ...prev, nombre: nombreError }));
    }
  }, [debouncedNombre, formData.nombre, validateField]);

  useEffect(() => {
    if (debouncedTelefono && formData.telefono) {
      const telefonoError = validateField('telefono', debouncedTelefono);
      setErrors(prev => ({ ...prev, telefono: telefonoError }));
    }
  }, [debouncedTelefono, formData.telefono, validateField]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Para campos que no usan debounce, validar inmediatamente
    if (name === 'asunto' || name === 'mensaje') {
      const fieldError = validateField(name as keyof FormData, value);
      setErrors(prev => ({ ...prev, [name]: fieldError }));
    }
  }, [validateField]);

  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    Object.keys(formData).forEach(key => {
      const fieldName = key as keyof FormData;
      const error = validateField(fieldName, formData[fieldName]);
      if (error) {
        newErrors[fieldName as keyof FormErrors] = error;
      }
    });

    return newErrors;
  }, [formData, validateField]);

  const { data: settings } = useFinancialSettings();

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formErrors = validateForm();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Lógica de Redirección a WhatsApp
      const rawPhone = (settings as any)?.whatsappPhone || '584120000000';
      const phone = rawPhone.replace(/\D/g, ''); // Limpiar para wa.me
      
      const message = `*Nueva consulta desde VirtuAbogado*
      
*Nombre:* ${formData.nombre}
*Email:* ${formData.email}
*Teléfono:* ${formData.telefono}
*Asunto:* ${formData.asunto}
*Mensaje:* ${formData.mensaje}`;

      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      
      // Simulación de delay para UX
      const timer1 = setTimeout(() => {
        if (!mountedRef.current) return;
        window.open(waUrl, '_blank');
        
        setIsSubmitting(false);
        setSubmitSuccess(true);
        setFormData({
          nombre: '',
          email: '',
          telefono: '',
          asunto: '',
          mensaje: ''
        });
        setErrors({});

        onSubmitSuccess?.();

        const timer2 = setTimeout(() => {
          if (!mountedRef.current) return;
          setSubmitSuccess(false);
        }, 5000);
        timersRef.current.push(timer2);
      }, 1000);
      timersRef.current.push(timer1);

    } catch (error) {
      console.error('Error al procesar el contacto:', error);
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmitSuccess, (settings as any)?.whatsappPhone]);

  const asuntoOptions = useMemo(() => [
    { value: '', label: 'Selecciona un asunto' },
    { value: 'Consulta legal', label: 'Consulta legal' },
    { value: 'Revisión de documentos', label: 'Revisión de documentos' },
    { value: 'Representación legal', label: 'Representación legal' },
    { value: 'Información general', label: 'Información general' },
    { value: 'Otro', label: 'Otro' }
  ], []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const loadingSpinner = useMemo(() => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ), []);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-card p-8"
    >
      <h2 className="text-2xl font-bold text-azul-primario mb-6">Envíanos un mensaje</h2>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-lg">
          ¡Gracias por tu mensaje! Te contactaremos pronto.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-azul-primario mb-1">
            Nombre completo *
          </label>
          <input
            type="text"
            id="nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={`w-full px-4 py-3 border ${errors.nombre ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition duration-200`}
            placeholder="Tu nombre"
          />
          {errors.nombre && <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-azul-primario mb-1">
            Correo electrónico *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-3 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition duration-200`}
            placeholder="tu@ejemplo.com"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-azul-primario mb-1">
            Teléfono *
          </label>
          <input
            type="tel"
            id="telefono"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className={`w-full px-4 py-3 border ${errors.telefono ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition duration-200`}
            placeholder="+58 XXX XXX XXX"
          />
          {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>}
        </div>

        <div>
          <label htmlFor="asunto" className="block text-sm font-medium text-azul-primario mb-1">
            Asunto *
          </label>
          <select
            id="asunto"
            name="asunto"
            value={formData.asunto}
            onChange={handleChange}
            className={`w-full px-4 py-3 border ${errors.asunto ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition duration-200`}
          >
            {asuntoOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.asunto && <p className="mt-1 text-sm text-red-600">{errors.asunto}</p>}
        </div>

        <div>
          <label htmlFor="mensaje" className="block text-sm font-medium text-azul-primario mb-1">
            Mensaje *
          </label>
          <textarea
            id="mensaje"
            name="mensaje"
            rows={5}
            value={formData.mensaje}
            onChange={handleChange}
            className={`w-full px-4 py-3 border ${errors.mensaje ? 'border-red-500' : 'border-gray-300'} rounded-xl focus:ring-2 focus:ring-vinotinto focus:border-vinotinto transition duration-200`}
            placeholder="Escribe tu mensaje aquí..."
          ></textarea>
          {errors.mensaje && <p className="mt-1 text-sm text-red-600">{errors.mensaje}</p>}
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`btn-primary w-full flex justify-center items-center ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isSubmitting ? (
              <>
                {loadingSpinner}
                Enviando...
              </>
            ) : (
              'Enviar mensaje'
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
});

FormularioContacto.displayName = 'FormularioContacto';

export default FormularioContacto;