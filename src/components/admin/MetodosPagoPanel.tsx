'use client';

import React from 'react';
import { useMetodosPagoPanel } from './hooks/useMetodosPagoPanel';
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
    const {
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
    } = useMetodosPagoPanel();

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
                        Gestión de Pagos
                    </h2>
                    <p className="text-azul-claro/80 mt-2 max-w-2xl text-balance">
                        Gestión centralizada de pasarelas. Activa o desactiva proveedores y ajusta sus nombres comerciales sin exponer credenciales sensibles.
                    </p>
                </div>
                <div className="relative z-10 mt-6 md:mt-0 w-full md:w-auto text-right">
                    <button 
                        onClick={openCreateModal}
                        className="bg-white text-azul-primario font-bold px-6 py-3 rounded-xl hover:shadow-lg transition flex items-center gap-2 w-full md:w-auto justify-center"
                    >
                        <FiPlus size={20} />
                        Nueva Pasarela
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
                            method.isActive ? 'border-azul-primario/20' : 'border-gray-100 grayscale'
                        }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${
                                    method.isActive ? 'bg-azul-claro text-azul-primario' : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {method.identifier === 'zenobank' ? <FiActivity size={28} /> : <FiCreditCard size={28} />}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-azul-primario">{method.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        {method.isActive ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <FiCheckCircle size={10} /> Operativo
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                <FiXCircle size={10} /> Suspendido
                                            </span>
                                        )}
                                        <span className="text-[10px] text-gray-400 font-mono">ID: {method.identifier}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones en Header */}
                            <div className="flex flex-col items-end gap-3">
                                {/* Toggle Switch */}
                                <button
                                    onClick={() => handleToggle(method.id, method.isActive)}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-azul-primario focus:ring-offset-2 ${
                                        method.isActive ? 'bg-azul-primario' : 'bg-gray-300'
                                    }`}
                                    title={method.isActive ? "Detener operaciones" : "Reactivar operaciones"}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                                            method.isActive ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>

                                {/* Mini Toolbar */}
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => openEditModal(method)}
                                        className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-azul-50 hover:text-azul-primario transition shadow-sm border border-gray-100"
                                        title="Configurar Nombre"
                                    >
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(method.id)}
                                        className="p-2 bg-gray-50 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 transition shadow-sm border border-gray-100"
                                        title="Eliminar lógicamente"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-gray-500 italic">
                                <FiShield size={14} className="text-green-500" />
                                <span>Zero-Exposure Architecture</span>
                            </div>
                            <span className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                                {method.isActive ? 'Active' : 'Offline'}
                            </span>
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
                                    {editingMethod ? 'Ajustes de Pasarela' : 'Registrar Pasarela'}
                                </h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                    <FiX size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-5">
                                <div className="space-y-4">
                                    {/* Titulo Comercial */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Comercial</label>
                                        <input 
                                            type="text" 
                                            required
                                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-azul-primario focus:border-azul-primario transition"
                                            placeholder="Ej: Tarjeta de Crédito, Criptomonedas"
                                            value={formData.name}
                                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        />
                                        <p className="text-xs text-gray-400 mt-1">Nombre visible para el cliente final.</p>
                                    </div>

                                    {/* ID Técnico */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Identificador de Sistema</label>
                                        <input 
                                            type="text" 
                                            required
                                            disabled={!!editingMethod}
                                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-azul-primario focus:border-azul-primario transition bg-gray-50 disabled:text-gray-400 font-mono"
                                            placeholder="Ej: stripe, zenobank, mock"
                                            value={formData.identifier}
                                            onChange={(e) => setFormData({...formData, identifier: e.target.value.toLowerCase().replace(/\s/g, '_')})}
                                        />
                                        {!editingMethod && <p className="text-xs text-amber-600 mt-1 font-medium">Debe coincidir con la lógica del servidor.</p>}
                                    </div>
                                    
                                    {/* Switch de Estado */}
                                    <div className="flex items-center justify-between p-4 bg-azul-50/50 rounded-xl border border-azul-100">
                                        <div>
                                            <p className="font-bold text-azul-primario text-sm">Estado Operativo</p>
                                            <p className="text-xs text-azul-600/70">Determina si los clientes ven este método.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({...formData, isActive: !formData.isActive})}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-azul-primario focus:ring-offset-2 ${
                                                formData.isActive ? 'bg-azul-primario' : 'bg-gray-300'
                                            }`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${formData.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end gap-3 border-t border-gray-100">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="btn-secondary flex-1"
                                    >
                                        Cerrar
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn-primary flex-1"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Banner de Seguridad Svix */}
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-xl">
                <div className="flex items-start gap-3">
                    <FiShield className="text-green-600 mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="text-green-800 font-bold uppercase tracking-wider text-xs">Protección de Webhooks Svix</h4>
                        <p className="text-green-700 text-sm mt-1">
                            Este sistema utiliza **Svix** para la validación de firmas HMAC. Las credenciales están blindadas en el servidor para una seguridad de nivel bancario.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
