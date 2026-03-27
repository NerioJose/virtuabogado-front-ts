'use client';

import React, { useState } from 'react';
import { usePaymentMethods } from '@/features/checkout/hooks/usePaymentMethods';
import { 
    togglePaymentMethodAction, 
    createPaymentMethodAction, 
    updatePaymentMethodAction, 
    deletePaymentMethodAction 
} from '@/features/checkout/actions/paymentMethods';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
    FiCreditCard, 
    FiShield, 
    FiCheckCircle, 
    FiXCircle, 
    FiSettings,
    FiActivity,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiX,
    FiKey
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export default function MetodosPagoPanel() {
    const { data: methods, isLoading } = usePaymentMethods(true);
    const queryClient = useQueryClient();

    // Estado del modal CRUD
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        titulo: '',
        activo: false,
        apiKey: '',
        apiSecret: ''
    });

    const handleToggle = async (id: string, currentStatus: boolean) => {
        const loadingToast = toast.loading('Actualizando estado...');
        try {
            const result = await togglePaymentMethodAction(id, !currentStatus);
            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: ['PaymentMethods'] });
                toast.success('Estado actualizado correctamente', { id: loadingToast });
            } else {
                toast.error(result.message || 'Error al actualizar', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Error de conexión', { id: loadingToast });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar definitivamente esta pasarela?')) return;
        
        const loadingToast = toast.loading('Eliminando configuración...');
        try {
            const result = await deletePaymentMethodAction(id);
            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: ['PaymentMethods'] });
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
        setFormData({ name: '', titulo: '', activo: true, apiKey: '', apiSecret: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (method: any) => {
        setEditingMethod(method);
        const config = method.config || {};
        setFormData({
            name: method.name,
            titulo: method.titulo,
            activo: method.activo,
            apiKey: config.apiKey || '',
            apiSecret: config.apiSecret || ''
        });
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const loadingToast = toast.loading('Guardando configuración segura...');

        try {
            const configPayload = {
                apiKey: formData.apiKey,
                apiSecret: formData.apiSecret
            };

            let result;
            if (editingMethod) {
                result = await updatePaymentMethodAction(editingMethod.id, {
                    titulo: formData.titulo,
                    activo: formData.activo,
                    config: configPayload
                });
            } else {
                result = await createPaymentMethodAction({
                    name: formData.name,
                    titulo: formData.titulo,
                    activo: formData.activo,
                    config: configPayload
                });
            }

            if (result.success) {
                await queryClient.invalidateQueries({ queryKey: ['PaymentMethods'] });
                toast.success('Configuración de pasarela guardada guardada', { id: loadingToast });
                setIsModalOpen(false);
            } else {
                toast.error(result.message || 'Error al guardar', { id: loadingToast });
            }
        } catch (error) {
            toast.error('Error de comunicación', { id: loadingToast });
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-12 h-12 border-4 border-azul-primario border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Cargando pasarelas de pago...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Informativo */}
            <div className="bg-gradient-to-r from-azul-primario to-indigo-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
                <div className="relative z-10 w-full md:w-2/3">
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <FiShield className="text-azul-claro" />
                        Métodos de Pago
                    </h2>
                    <p className="text-azul-claro/80 mt-2 max-w-2xl">
                        Gestiona las configuraciones de pasarelas activas. Ajusta credenciales de acceso y determina la disponibilidad operativa en el flujo de cobranza principal.
                    </p>
                </div>
                <div className="relative z-10 mt-6 md:mt-0 w-full md:w-auto text-right">
                    <button 
                        onClick={openCreateModal}
                        className="bg-white text-azul-primario font-bold px-6 py-3 rounded-xl hover:shadow-lg transition flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <FiPlus size={20} />
                        Añadir Método
                    </button>
                </div>
                <FiActivity className="absolute right-[-20px] top-[-20px] w-64 h-64 text-white/5 rotate-12" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {methods?.map((method: any) => (
                    <motion.div
                        key={method.id}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`bg-white rounded-2xl shadow-md border-2 transition-all p-6 relative group ${
                            method.activo ? 'border-azul-primario/20' : 'border-gray-100 grayscale'
                        }`}
                    >
                        {/* Acciones Rápidas Ocultas */}
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => openEditModal(method)}
                                className="p-2 bg-azul-50 text-azul-primario rounded-lg hover:bg-azul-100 transition"
                                title="Editar Configuración"
                            >
                                <FiEdit2 size={16} />
                            </button>
                            <button 
                                onClick={() => handleDelete(method.id)}
                                className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition"
                                title="Eliminar Pasarela"
                            >
                                <FiTrash2 size={16} />
                            </button>
                        </div>

                        <div className="flex items-start justify-between mt-2">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                                    method.activo ? 'bg-azul-claro text-azul-primario' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    <FiCreditCard size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-azul-primario">{method.titulo}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {method.activo ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <FiCheckCircle size={10} /> Operativo
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <FiXCircle size={10} /> Suspendido
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400 font-mono">ID: {method.name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Switch de activación */}
                            <button
                                onClick={() => handleToggle(method.id, method.activo)}
                                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-azul-primario focus:ring-offset-2 ${
                                    method.activo ? 'bg-azul-primario' : 'bg-gray-300'
                                }`}
                                title={method.activo ? "Deterner operaciones" : "Reactivar operaciones"}
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                        method.activo ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500">
                                <FiKey size={14} className={method.config?.apiKey ? 'text-green-500' : 'text-gray-300'} />
                                <span>{method.config?.apiKey ? 'Credenciales Configuradas' : 'Sin Credenciales'}</span>
                            </div>
                            <button 
                                onClick={() => openEditModal(method)}
                                className="text-azul-primario font-bold hover:underline"
                            >
                                Gestionar Acceso
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Modal de Configuración */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setIsModalOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl w-full max-w-lg relative z-10 shadow-2xl overflow-hidden"
                        >
                            <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-2xl font-bold text-azul-primario flex items-center gap-2">
                                    <FiSettings className="text-gray-400" />
                                    {editingMethod ? 'Editar Configuración' : 'Nueva Pasarela'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                    <FiX size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Titulo Comercial */}
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Comercial</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-azul-primario focus:border-azul-primario transition"
                                            placeholder="Ej: Tarjeta de Crédito, Zenobank"
                                            value={formData.titulo}
                                            onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Este es el nombre visible para los clientes.</p>
                                    </div>

                                    {/* ID Interno */}
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Identificador de Integración</label>
                                        <input 
                                            type="text" 
                                            required
                                            disabled={!!editingMethod} // No editable si ya existe
                                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-azul-primario focus:border-azul-primario transition bg-gray-50 disabled:text-gray-400"
                                            placeholder="Ej: stripe, zenobank, mock"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                                        />
                                    </div>
                                    
                                    {/* Estado Operativo */}
                                    <div className="col-span-2 flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">Estado Inmediato</p>
                                            <p className="text-xs text-gray-500">¿Desea activar esta pasarela al guardar?</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, activo: !formData.activo})}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-azul-primario focus:ring-offset-2 ${
                                                formData.activo ? 'bg-azul-primario' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formData.activo ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="col-span-2 pt-4 border-t border-gray-100">
                                        <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                            <FiKey className="text-azul-primario" /> Credenciales de Acceso
                                        </h4>
                                    </div>
                                    
                                    {/* API Keys */}
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Clave de Acceso Pública</label>
                                        <input 
                                            type="password" 
                                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-azul-primario focus:border-azul-primario transition font-mono text-sm"
                                            placeholder="pk_test_..."
                                            value={formData.apiKey}
                                            onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Secreto de Conexión Privado</label>
                                        <input 
                                            type="password" 
                                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-red-300 focus:border-red-400 transition font-mono text-sm"
                                            placeholder="sk_test_..."
                                            value={formData.apiSecret}
                                            onChange={(e) => setFormData({...formData, apiSecret: e.target.value})}
                                        />
                                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                            <FiShield /> Esta información se almacena cifrada en el sistema Zero-Trust.
                                        </p>
                                    </div>

                                </div>

                                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="btn-secondary px-6"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-primary px-8"
                                    >
                                        Guardar Parámetros
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Aviso de Confidencialidad */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                <div className="flex items-start gap-3">
                    <FiShield className="text-amber-600 mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="text-amber-800 font-bold">Protocolo de Alta Seguridad Activado</h4>
                        <p className="text-amber-700 text-sm mt-1">
                            El acceso y manipulación de parámetros operativos está restringido. Modificar claves de acceso críticas afectará de forma inmediata las transacciones electrónicas de la firma. Los valores son asimilados por el núcleo de seguridad dinámicamente.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
