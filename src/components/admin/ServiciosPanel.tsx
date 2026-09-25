'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    FiEdit2,
    FiCheck,
    FiX,
    FiPower,
    FiDollarSign,
    FiInfo,
    FiPlus
} from 'react-icons/fi';
import { useServiciosPanel } from './hooks/useServiciosPanel';
import DualPrice from '@/components/ui/DualPrice';
import { formatPEN } from '@/lib/finance';
import { penToUsd } from '@/lib/money';

export default function ServiciosPanel() {
    const {
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
        isUpdating
    } = useServiciosPanel();

    if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando catálogo de servicios...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error al cargar servicios</div>;

    const priceValue = Number(editForm.precio) || 0;
    const hasRate = !!rate && rate > 0;

    const pricePreview = hasRate
        ? precioMode === 'USD'
            ? `≈ ${formatPEN(penToUsd(priceValue, rate!))} (tasa S/ ${Number(rate).toFixed(2)})`
            : `≈ ${formatPEN(priceValue)} → US$ ${penToUsd(priceValue, rate!)} (tasa S/ ${Number(rate).toFixed(2)})`
        : '';

    const renderForm = () => (
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Título del Servicio</label>
                    <input
                        type="text"
                        value={editForm.titulo || ''}
                        onChange={e => setEditForm({ ...editForm, titulo: e.target.value })}
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-primario outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Precio</label>
                        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => switchPrecioMode('USD')}
                                className={`px-3 py-1 transition ${precioMode === 'USD' ? 'bg-azul-primario text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                US$
                            </button>
                            <button
                                type="button"
                                onClick={() => switchPrecioMode('PEN')}
                                disabled={!hasRate}
                                title={!hasRate ? 'No hay tasa de cambio disponible para cargar el precio en soles' : undefined}
                                className={`px-3 py-1 transition ${precioMode === 'PEN' ? 'bg-azul-primario text-white' : 'text-gray-500 hover:bg-gray-100'} disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                                S/
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{precioMode === 'USD' ? '$' : 'S/'}</span>
                        <input
                            type="number"
                            min="0"
                            step={precioMode === 'USD' ? '0.01' : '0.5'}
                            value={editForm.precio ?? 0}
                            onChange={e => setEditForm({ ...editForm, precio: parseFloat(e.target.value) || 0 })}
                            className="w-full p-2.5 pl-7 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-primario outline-none"
                        />
                    </div>
                    {precioMode === 'PEN' && !hasRate ? (
                        <p className="mt-1 text-[10px] text-red-500">No hay tasa de cambio disponible: no se puede guardar el precio en soles.</p>
                    ) : (
                        <p className="mt-1 text-[10px] text-gray-400">
                            Se guarda en {precioMode === 'USD' ? 'dólares (canónico)' : 'soles exactos (canónico) y su equivalente en dólares con la tasa actual'}. {pricePreview}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">URL de Imagen (Opcional)</label>
                    <input
                        type="text"
                        placeholder="/images/ejemplo.jpg (vacío = imagen por defecto)"
                        defaultValue={editForm.imagenUrl || ''}
                        onBlur={e => setEditForm({ ...editForm, imagenUrl: e.target.value })}
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-claro outline-none text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estado de Visibilidad</label>
                    <select
                        value={editForm.activo ? 'true' : 'false'}
                        onChange={(e) => setEditForm({ ...editForm, activo: e.target.value === 'true' })}
                        className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-primario outline-none"
                    >
                        <option value="true">Visible en la Web</option>
                        <option value="false">Oculto (Borrador)</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Descripción del Servicio</label>
                <textarea
                    rows={3}
                    value={editForm.descripcion || ''}
                    onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                    className="w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-primario outline-none resize-none"
                />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button"
                    onClick={handleCancel}
                    className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition flex items-center gap-2 font-medium"
                >
                    <FiX size={18} /> Cancelar
                </button>
                <button type="button"
                    onClick={isCreating ? handleCreate : handleSave}
                    disabled={isUpdating}
                    className="px-5 py-2.5 bg-azul-primario text-white rounded-xl hover:bg-azul-primario/90 shadow-md shadow-azul-primario/20 transition flex items-center gap-2 font-medium"
                >
                    {isUpdating ? 'Guardando...' : <><FiCheck size={18} /> {isCreating ? 'Crear Servicio' : 'Guardar Cambios'}</>}
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-azul-primario">Gestión de Servicios</h3>
                {!isCreating && !editingId && (
                    <button type="button"
                        onClick={startCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-azul-primario text-white rounded-xl hover:bg-azul-primario/90 shadow-md shadow-azul-primario/20 transition font-medium"
                    >
                        <FiPlus size={18} /> Añadir Servicio
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <div className="px-6 pt-4 pb-2 border-b border-gray-100">
                        <h4 className="font-bold text-azul-primario">Nuevo Servicio</h4>
                    </div>
                    {renderForm()}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {services?.map((service) => (
                    <motion.div
                        key={service.id}
                        layout
                        className={`bg-white border rounded-xl overflow-hidden shadow-sm transition ${
                            !service.activo ? 'opacity-75 bg-gray-50' : 'hover:border-azul-primario/30'
                        }`}
                    >
                        {editingId === service.id ? (
                            renderForm()
                        ) : (
                            <div className="p-5 flex flex-col md:flex-row gap-4">
                                {/* Thumbnail miniatura */}
                                    <div className="relative w-full md:w-32 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 border">
                                        <img
                                            src={getServiceImage(service)}
                                            alt={service.titulo}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (target.src.includes('consulta-legal.png')) return; // Evitar loop infinito
                                                target.src = '/images/consulta-legal.png';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                    </div>

                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-bold text-lg text-azul-primario">{service.titulo}</h4>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            service.activo ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                                        }`}>
                                            {service.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2">{service.descripcion}</p>
                                    <div className="flex items-center gap-4 pt-1">
                                        <span className="flex items-center">
                                            <FiDollarSign size={14} className="text-azul-primario mr-1" />
                                            <DualPrice usd={service.precio} pen={service.precioPen} />
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <FiInfo size={12} /> {service.imagenUrl ? 'URL propia' : 'Auto-path'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                                    <button type="button"
                                        onClick={() => handleEdit(service)}
                                        className="p-2 text-gray-400 hover:text-azul-primario hover:bg-azul-claro/30 rounded-lg transition"
                                        title="Editar detalles"
                                    >
                                        <FiEdit2 size={20} />
                                    </button>
                                    <button type="button"
                                        onClick={() => toggleStatus(service)}
                                        className={`p-2 rounded-lg transition ${
                                            service.activo
                                            ? 'text-green-500 hover:bg-green-50'
                                            : 'text-gray-400 hover:bg-gray-100'
                                        }`}
                                        title={service.activo ? 'Desactivar servicio' : 'Activar servicio'}
                                    >
                                        <FiPower size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};