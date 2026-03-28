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
import { useFinancialSettings, useUpdateFinancialSettings } from '@/features/financial-settings/hooks/useFinancialSettings';
import { financialSettingsService } from '@/features/financial-settings/services/financial-settings.service';
import { useOrders } from '@/features/orders/hooks/useOrders';
import ServiciosPanel from './ServiciosPanel';

// Componente para configuración financiera (Extraído por claridad)
function FinancialSettingsSection() {
	const { data: financialSettings, isLoading: loadingSettings } = useFinancialSettings();
	const { data: response } = useOrders();
	const orders = response?.data || [];
	const updateSettings = useUpdateFinancialSettings();

	const [lawyerCommission, setLawyerCommission] = useState<number>(0);
	const [operationalCosts, setOperationalCosts] = useState<number>(0);
	const [taxPercentage, setTaxPercentage] = useState<number>(0);
	const [platformFee, setPlatformFee] = useState<number>(0);
	const [whatsappPhone, setWhatsappPhone] = useState<string>('');
	const [isSaving, setIsSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState('');

	useEffect(() => {
		if (financialSettings) {
			setLawyerCommission(financialSettings.lawyerCommissionPercentage || 0);
			setOperationalCosts(financialSettings.operationalCostsPercentage || 0);
			setTaxPercentage(financialSettings.taxPercentage || 0);
			setPlatformFee(financialSettings.platformFeePercentage || 0);
			setWhatsappPhone(financialSettings.whatsappPhone || '');
		}
	}, [financialSettings]);

	const validation = useMemo(() => {
		return financialSettingsService.validateSettings({
			lawyerCommissionPercentage: lawyerCommission,
			operationalCostsPercentage: operationalCosts,
			taxPercentage: taxPercentage,
			platformFeePercentage: platformFee,
			whatsappPhone: whatsappPhone
		});
	}, [lawyerCommission, operationalCosts, taxPercentage, platformFee, whatsappPhone]);

	const previewData = useMemo(() => {
		const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
		return financialSettingsService.calculatePreview(
			totalRevenue,
			lawyerCommission,
			operationalCosts,
			taxPercentage,
			platformFee,
			whatsappPhone
		);
	}, [orders, lawyerCommission, operationalCosts, taxPercentage, platformFee, whatsappPhone]);

	const handleSave = async () => {
		if (!validation.isValid) return;
		setIsSaving(true);
		setSaveMessage('');

		try {
			await updateSettings.mutateAsync({
				lawyerCommissionPercentage: lawyerCommission,
				operationalCostsPercentage: operationalCosts,
				taxPercentage: taxPercentage,
				platformFeePercentage: platformFee,
				whatsappPhone: whatsappPhone
			});
			setSaveMessage('Configuración financiera guardada correctamente');
			setTimeout(() => setSaveMessage(''), 3000);
		} catch (error) {
			console.error('Error saving financial settings:', error);
			setSaveMessage('Error al guardar la configuración');
		} finally {
			setIsSaving(false);
		}
	};

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

						<button
							onClick={handleSave}
							disabled={!validation.isValid || isSaving}
							className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-azul-primario text-white font-bold rounded-lg hover:bg-azul-primario/90 transition-all disabled:opacity-50 shadow-md">
							{isSaving ? 'Guardando...' : <><FiSave /> Guardar Configuración</>}
						</button>
					</div>

					<div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
						<div className="flex items-center gap-2 text-azul-primario font-bold">
							<FiTrendingUp /> <h3>Simulación (Basado en ${previewData.totalRevenue?.toLocaleString()})</h3>
						</div>
						
						<div className="space-y-2">
							<div className="flex justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
								<span className="text-sm text-gray-500">Para Abogados</span>
								<span className="font-bold text-blue-600">${previewData.lawyerPayments?.toLocaleString()}</span>
							</div>
							<div className="flex justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
								<span className="text-sm text-gray-500">Gastos Operativos</span>
								<span className="font-bold text-orange-600">${previewData.operationalCosts?.toLocaleString()}</span>
							</div>
							<div className="flex justify-between p-3 bg-white rounded-lg border-2 border-green-100 shadow-sm">
								<span className="text-sm font-bold text-gray-700">Neto Plataforma</span>
								<div className="text-right">
									<div className="font-bold text-green-600 text-lg">${previewData.netProfit?.toLocaleString()}</div>
									<div className="text-[10px] text-gray-400 uppercase font-black">Margen: {previewData.profitMargin?.toFixed(1)}%</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

type TabType = 'perfil' | 'financiero' | 'servicios';

export default function ConfiguracionPanel() {
	const [activeTab, setActiveTab] = useState<TabType>('servicios');

	return (
		<div className="space-y-8">
			<div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
				<div className="flex border-b border-gray-100">
					<button
						onClick={() => setActiveTab('servicios')}
						className={`px-8 py-5 text-sm font-bold transition-all flex items-center gap-3 border-r border-gray-50 ${
							activeTab === 'servicios' 
								? 'bg-azul-primario text-white' 
								: 'text-gray-500 hover:bg-azul-claro/20'
						}`}
					>
						<FiShield size={20} /> Catálogo de Servicios
					</button>

					<button
						onClick={() => setActiveTab('financiero')}
						className={`px-8 py-5 text-sm font-bold transition-all flex items-center gap-3 border-r border-gray-50 ${
							activeTab === 'financiero' 
								? 'bg-azul-primario text-white' 
								: 'text-gray-500 hover:bg-azul-claro/20'
						}`}
					>
						<FiCreditCard size={20} /> Configuración de Pagos
					</button>

					<button
						onClick={() => setActiveTab('perfil')}
						className={`px-8 py-5 text-sm font-bold transition-all flex items-center gap-3 ${
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
