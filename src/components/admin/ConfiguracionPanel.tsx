'use client';

import { useState, useMemo, useEffect } from 'react';
import {
	FiSave,
	FiRefreshCw,
	FiAlertTriangle,
	FiCheck,
	FiDollarSign,
	FiTrendingUp,
	FiAlertCircle,
    FiUser,
    FiShield,
    FiCreditCard,
    FiMessageCircle
} from 'react-icons/fi';
import { useAdminServices } from '@/features/services/hooks/useServices';
import ServiciosPanel from './ServiciosPanel';
import { useConfiguracionPanel } from '@/features/financial-settings/hooks/useConfiguracionPanel';
import { useAdminConfiguracion, TabType } from './hooks/useAdminConfiguracion';

// Componente para configuración financiera (Extraído por claridad)
function FinancialSettingsSection() {
	const {
		loadingSettings,
		lawyerCommission, setLawyerCommission,
		operationalCosts, setOperationalCosts,
		taxPercentage, setTaxPercentage,
		platformFee, setPlatformFee,
		simulationBase, setSimulationBase,
		whatsappPhone, setWhatsappPhone,
		validation,
		previewData,
		isSaving,
		saveMessage,
		handleSave
	} = useConfiguracionPanel();

	if (loadingSettings) {
		return (
			<div className="bg-white rounded-xl shadow-sm overflow-hidden p-6 border border-gray-100 italic text-gray-400">
				Cargando configuración financiera...
			</div>
		);
	}

	return (
		<div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
			<div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-green-50/50 to-blue-50/50">
				<div className="flex items-center">
					<FiDollarSign className="text-green-600 text-2xl mr-3" />
					<div>
						<h2 className="text-lg font-bold text-azul-primario">Comisiones y Pagos</h2>
						<p className="text-xs text-gray-500">Define los porcentajes para repartición de ingresos</p>
					</div>
				</div>
			</div>

			<div className="p-6">
				{saveMessage && (
					<div className={`mb-6 p-3 rounded-lg flex items-center text-sm ${saveMessage.includes('Error')
						? 'bg-red-50 text-red-700'
						: 'bg-green-50 text-green-700 font-medium'
						}`}>
						<FiCheck className="mr-2" /> {saveMessage}
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div className="space-y-6">
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-bold text-gray-700 mb-1">Comisión Abogados (%)</label>
								<input
									type="number"
									min="0" max="100" step="0.1"
									value={lawyerCommission}
									onChange={(e) => setLawyerCommission(parseFloat(e.target.value) || 0)}
									className="block w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-primario outline-none"
                                    placeholder="70.0"
								/>
								<p className="mt-1 text-xs text-gray-400">Este es el monto directo que el abogado recibe por cada caso.</p>
							</div>

							<div>
								<label className="block text-sm font-bold text-gray-700 mb-1">Gastos Operativos (%)</label>
								<input
									type="number"
									min="0" max="100" step="0.1"
									value={operationalCosts}
									onChange={(e) => setOperationalCosts(parseFloat(e.target.value) || 0)}
									className="block w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-primario outline-none"
                                    placeholder="0.0"
								/>
								<p className="mt-1 text-xs text-gray-400">Fondos destinados a mantenimiento y servidores.</p>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm font-bold text-gray-700 mb-1">Impuestos (%)</label>
									<input
										type="number"
										min="0" max="100" step="0.1"
										value={taxPercentage}
										onChange={(e) => setTaxPercentage(parseFloat(e.target.value) || 0)}
										className="block w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-primario outline-none"
										placeholder="0.0"
									/>
								</div>
								<div>
									<label className="block text-sm font-bold text-gray-700 mb-1">Plataforma (%)</label>
									<input
										type="number"
										min="0" max="100" step="0.1"
										value={platformFee}
										onChange={(e) => setPlatformFee(parseFloat(e.target.value) || 0)}
										className="block w-full p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-azul-primario outline-none"
										placeholder="0.0"
									/>
								</div>
							</div>

							<div className="pt-4 border-t border-gray-100">
								<div className="flex items-center gap-2 text-green-600 font-bold mb-3">
									<FiMessageCircle /> <h4>Contacto Directo</h4>
								</div>
								<label className="block text-sm font-bold text-gray-700 mb-1">WhatsApp de Contacto</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">+</span>
									<input
										type="text"
										value={whatsappPhone}
										onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
										className="block w-full pl-7 p-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
										placeholder="51999888777"
									/>
								</div>
								<p className="mt-1 text-[10px] text-gray-400">Sin espacios ni símbolos. Ejemplo: 584121234567</p>
							</div>
						</div>

						{validation.errors.length > 0 && (
							<div className="bg-red-50 rounded-lg p-3 text-xs text-red-600 border border-red-100 space-y-1">
								{validation.errors.map((error, idx) => (<div key={idx} className="flex gap-2"><FiAlertCircle className="mt-0.5" /> {error}</div>))}
							</div>
						)}

						<button type="button"
							onClick={handleSave}
							disabled={!validation.isValid || isSaving}
							className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-azul-primario text-white font-bold rounded-lg hover:bg-azul-primario/90 transition disabled:opacity-50 shadow-md">
							{isSaving ? 'Guardando...' : <><FiSave /> Guardar Configuración</>}
						</button>
					</div>

					<div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
						<div className="flex items-center gap-2 text-azul-primario font-bold">
							<FiTrendingUp /> <h3>Simulación de Ganancias (USD)</h3>
						</div>

                        <div>
                            <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Monto Base de Simulación</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input 
                                    type="number"
                                    value={simulationBase}
                                    onChange={(e) => setSimulationBase(Number(e.target.value))}
                                    className="block w-full pl-7 p-2 border border-blue-100 bg-white rounded-lg focus:ring-2 focus:ring-azul-primario outline-none font-bold text-azul-primario"
                                />
                            </div>
                            <p className="mt-1 text-[10px] text-gray-500 italic">
                                *Basado en la suma de precios de tus servicios activos.
                            </p>
                        </div>
						
						<div className="space-y-2 pt-2">
							<div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition hover:bg-blue-50/30">
								<span className="text-sm text-gray-500">Para Abogados ({lawyerCommission}%)</span>
								<span className="font-bold text-blue-600">${previewData.lawyerPayments?.toFixed(2)}</span>
							</div>
							<div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition hover:bg-orange-50/30">
								<span className="text-sm text-gray-500">Gastos Op. ({operationalCosts}%)</span>
								<span className="font-bold text-orange-600">${previewData.operationalCosts?.toFixed(2)}</span>
							</div>
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition hover:bg-red-50/30">
								<span className="text-sm text-gray-500">Impuestos ({taxPercentage}%)</span>
								<span className="font-bold text-red-500">${previewData.taxAmount?.toFixed(2)}</span>
							</div>
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-100 shadow-sm transition hover:bg-indigo-50/30">
								<span className="text-sm text-gray-500">Fee Plataforma ({platformFee}%)</span>
								<span className="font-bold text-indigo-600">${previewData.platformFee?.toFixed(2)}</span>
							</div>

                            <div className="pt-2">
                                <div className="flex justify-between p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg border-2 border-white/20 text-white transition-transform hover:scale-[1.02]">
                                    <div>
                                        <span className="text-xs font-black uppercase opacity-80">Neto para la Empresa</span>
                                        <div className="text-2xl font-black">${previewData.netProfit?.toFixed(2)} <span className="text-xs font-light">USD</span></div>
                                    </div>
                                    <div className="text-right flex flex-col justify-end">
                                        <div className="text-[10px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full inline-block">
                                            Margen: {previewData.profitMargin?.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            </div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function ConfiguracionPanel() {
	const { activeTab, handleTabChange } = useAdminConfiguracion();

	return (
		<div className="space-y-8">
			<div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
				<div className="flex border-b border-gray-100">
					<button type="button"
						onClick={() => handleTabChange('servicios')}
						className={`px-8 py-5 text-sm font-bold transition flex items-center gap-3 border-r border-gray-50 ${
							activeTab === 'servicios' 
								? 'bg-azul-primario text-white' 
								: 'text-gray-500 hover:bg-azul-claro/20'
						}`}
					>
						<FiShield size={20} /> Catálogo de Servicios
					</button>

					<button type="button"
						onClick={() => handleTabChange('financiero')}
						className={`px-8 py-5 text-sm font-bold transition flex items-center gap-3 border-r border-gray-50 ${
							activeTab === 'financiero' 
								? 'bg-azul-primario text-white' 
								: 'text-gray-500 hover:bg-azul-claro/20'
						}`}
					>
						<FiCreditCard size={20} /> Configuración de Pagos
					</button>

					<button type="button"
						onClick={() => handleTabChange('perfil')}
						className={`px-8 py-5 text-sm font-bold transition flex items-center gap-3 ${
							activeTab === 'perfil' 
								? 'bg-azul-primario text-white' 
								: 'text-gray-500 hover:bg-azul-claro/20'
						}`}
					>
						<FiUser size={20} /> Perfil de Empresa
					</button>
				</div>

				<div className="p-8 bg-gray-50/30">
					{activeTab === 'servicios' && <ServiciosPanel />}
					{activeTab === 'financiero' && <FinancialSettingsSection />}
					{activeTab === 'perfil' && (
						<div className="p-20 text-center text-gray-400 italic">
							Módulo de configuración de perfil bajo mantenimiento
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
