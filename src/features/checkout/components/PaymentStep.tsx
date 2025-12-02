import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiCreditCard, FiLock } from 'react-icons/fi';
import { useCheckout } from '../hooks/useCheckout';
import type { PaymentData } from '../types/checkout.types';

export const PaymentStep: React.FC = () => {
    const { setPaymentData, submitOrder, setStep, isLoading, total } = useCheckout();

    const [formData, setFormData] = useState<PaymentData>({
        cardNumber: '',
        cardHolder: '',
        expiryDate: '',
        cvv: '',
        saveCard: false,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof PaymentData, string>>>({});

    const formatCardNumber = (value: string) => {
        const cleaned = value.replace(/\s/g, '');
        const chunks = cleaned.match(/.{1,4}/g);
        return chunks ? chunks.join(' ') : cleaned;
    };

    const formatExpiryDate = (value: string) => {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 2) {
            return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
        }
        return cleaned;
    };

    const validateField = (name: keyof PaymentData, value: string): string | undefined => {
        switch (name) {
            case 'cardNumber':
                const cleaned = value.replace(/\s/g, '');
                if (!cleaned) return 'Número de tarjeta requerido';
                if (cleaned.length < 15) return 'Número de tarjeta incompleto';
                break;
            case 'cardHolder':
                if (!value.trim()) return 'Nombre del titular requerido';
                if (value.trim().length < 3) return 'Nombre muy corto';
                break;
            case 'expiryDate':
                if (!value) return 'Fecha de vencimiento requerida';
                const [month, year] = value.split('/');
                if (!month || !year) return 'Formato inválido (MM/AA)';
                const monthNum = parseInt(month);
                if (monthNum < 1 || monthNum > 12) return 'Mes inválido';
                break;
            case 'cvv':
                if (!value) return 'CVV requerido';
                if (value.length < 3) return 'CVV incompleto';
                break;
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;

        let newValue = type === 'checkbox' ? checked : value;

        // Formatear campos específicos
        if (name === 'cardNumber' && typeof newValue === 'string') {
            newValue = formatCardNumber(newValue.replace(/\D/g, '').slice(0, 16));
        } else if (name === 'expiryDate' && typeof newValue === 'string') {
            newValue = formatExpiryDate(newValue);
        } else if (name === 'cvv' && typeof newValue === 'string') {
            newValue = newValue.replace(/\D/g, '').slice(0, 4);
        }

        setFormData(prev => ({ ...prev, [name]: newValue }));

        // Limpiar error
        if (errors[name as keyof PaymentData]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const error = validateField(name as keyof PaymentData, value);
        if (error) {
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar todos los campos
        const newErrors: Partial<Record<keyof PaymentData, string>> = {};

        Object.keys(formData).forEach((key) => {
            if (key !== 'saveCard') {
                const error = validateField(key as keyof PaymentData, formData[key as keyof PaymentData] as string);
                if (error) {
                    newErrors[key as keyof PaymentData] = error;
                }
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Guardar datos de pago
        setPaymentData(formData);

        // Procesar pago
        try {
            await submitOrder();
        } catch (error) {
            console.error('Error processing payment:', error);
        }
    };

    return (
        <motion.form
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onSubmit={handleSubmit}
            className="space-y-4"
        >
            {/* Número de tarjeta */}
            <div>
                <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Número de tarjeta <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <FiCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`
              w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario
              ${errors.cardNumber ? 'border-red-500' : 'border-gray-300'}
            `}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                    />
                </div>
                {errors.cardNumber && <p className="mt-1 text-xs text-red-600">{errors.cardNumber}</p>}
            </div>

            {/* Titular */}
            <div>
                <label htmlFor="cardHolder" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del titular <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    id="cardHolder"
                    name="cardHolder"
                    value={formData.cardHolder}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={`
            w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario uppercase
            ${errors.cardHolder ? 'border-red-500' : 'border-gray-300'}
          `}
                    placeholder="JUAN PEREZ"
                />
                {errors.cardHolder && <p className="mt-1 text-xs text-red-600">{errors.cardHolder}</p>}
            </div>

            {/* Vencimiento y CVV */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-700 mb-1">
                        Vencimiento <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="expiryDate"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`
              w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario
              ${errors.expiryDate ? 'border-red-500' : 'border-gray-300'}
            `}
                        placeholder="MM/AA"
                        maxLength={5}
                    />
                    {errors.expiryDate && <p className="mt-1 text-xs text-red-600">{errors.expiryDate}</p>}
                </div>

                <div>
                    <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">
                        CVV <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            id="cvv"
                            name="cvv"
                            value={formData.cvv}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`
                w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-azul-primario focus:border-azul-primario
                ${errors.cvv ? 'border-red-500' : 'border-gray-300'}
              `}
                            placeholder="123"
                            maxLength={4}
                        />
                        <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                    {errors.cvv && <p className="mt-1 text-xs text-red-600">{errors.cvv}</p>}
                </div>
            </div>

            {/* Guardar tarjeta */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                    type="checkbox"
                    id="saveCard"
                    name="saveCard"
                    checked={formData.saveCard}
                    onChange={handleChange}
                    className="w-4 h-4 text-azul-primario border-gray-300 rounded focus:ring-azul-primario"
                />
                <label htmlFor="saveCard" className="text-sm text-gray-700">
                    Guardar tarjeta para futuras compras
                </label>
            </div>

            {/* Información de seguridad */}
            <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg">
                <FiLock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-800">
                    Tu información está protegida con encriptación SSL de 256 bits
                </p>
            </div>

            {/* Resumen y botones */}
            <div className="border-t pt-4 mt-6">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-600">Total a pagar:</span>
                    <span className="text-2xl font-bold text-azul-primario">${total.toFixed(2)}</span>
                </div>

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="btn-secondary flex-1"
                        disabled={isLoading}
                    >
                        ← Volver
                    </button>
                    <button
                        type="submit"
                        className="btn-primary flex-1"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Procesando...' : `Pagar $${total.toFixed(2)}`}
                    </button>
                </div>
            </div>
        </motion.form>
    );
};
