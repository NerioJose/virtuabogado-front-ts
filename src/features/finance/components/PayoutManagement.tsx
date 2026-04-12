'use client';

import { useState, useEffect } from 'react';
import { formatUSD } from '@/lib/finance';
import { usePayoutManagement } from '../hooks/usePayoutManagement';
import { 
    FiDollarSign, 
    FiClock, 
    FiCheckCircle, 
    FiPlus, 
    FiSend, 
    FiFileText,
    FiUser,
    FiLoader,
    FiAlertCircle,
    FiCalendar,
    FiArrowRight
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function PayoutManagement() {
    const {
        pending,
        history,
        loadingPending,
        loadingHistory,
        showModal,
        closeModal,
        reference,
        setReference,
        actionType,
        selectedLawyer,
        isProcessing,
        handleCreatePayout,
        handleFinalize,
        confirmFinalize
    } = usePayoutManagement();

    if (loadingPending || loadingHistory) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <FiLoader className="animate-spin text-azul-primario" size={40} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Cargando Tesorería...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* 📋 Pendientes de Liquidación */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-sm font-black text-azul-primario uppercase tracking-widest flex items-center gap-2">
                        <FiClock className="text-amber-500" />
                        Honorarios Pendientes de Pago
                    </h3>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                        {pending.length} Abogados esperando
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pending.length === 0 ? (
                        <div className="col-span-full py-12 bg-white rounded-[2rem] border border-slate-100 text-center">
                            <FiCheckCircle className="mx-auto text-emerald-400 mb-4" size={40} />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">¡Todo pagado! No hay honorarios pendientes.</p>
                        </div>
                    ) : (
                        pending.map((item, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white p-6 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-azul-primario/5 rounded-2xl flex items-center justify-center text-azul-primario">
                                        <FiUser size={24} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Honorarios</p>
                                        <p className="text-2xl font-black text-slate-900 tracking-tighter">{formatUSD(item.totalPending)}</p>
                                    </div>
                                </div>
                                <div className="space-y-1 mb-6">
                                    <p className="font-black text-slate-800 tracking-tight">{item.lawyer.nombre}</p>
                                    <p className="text-xs font-bold text-azul-primario uppercase tracking-tighter">{item.lawyer.especialidad}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        <span>Casos acumulados</span>
                                        <span className="text-azul-primario">{item.orderCount} Expedientes</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleCreatePayout(item)}
                                    disabled={isProcessing}
                                    className="w-full py-4 bg-azul-primario text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-azul-primario/90 transition-all shadow-lg shadow-azul-primario/25 flex items-center justify-center gap-2"
                                >
                                    {isProcessing ? <FiLoader className="animate-spin" /> : <FiPlus />}
                                    Autorizar Liquidación
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* 🕰️ Historial de Liquidaciones */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                    <h3 className="text-sm font-black text-azul-primario uppercase tracking-widest flex items-center gap-2">
                        <FiFileText className="text-indigo-500" />
                        Historial de Tesorería
                    </h3>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-200/60 overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-slate-100 text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Abogado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monto</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha / Estado</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Referencia</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No hay historial de pagos</td>
                                </tr>
                            ) : (
                                history.map((payout: any) => (
                                    <tr key={payout.id} className="group hover:bg-slate-50/30 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-slate-700">{payout.lawyer.nombre}</p>
                                            <div className="flex flex-col gap-1 mt-1">
                                                {payout.orders?.map((o: any) => (
                                                    <span key={o.id} className="text-[9px] text-slate-400 font-bold tracking-tight">
                                                        • {o.service?.titulo} ({formatUSD(Number(o.commissionAmount))})
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-lg font-black text-slate-900 tracking-tighter">{formatUSD(payout.amount)}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <FiCalendar className="text-slate-300" size={14} />
                                                    <span className="text-xs font-bold text-slate-500">{new Date(payout.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                    payout.status === 'COMPLETADO' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                    {payout.status === 'PENDIENTE' ? 'EN PROCESO' : payout.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {payout.reference ? (
                                                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 w-fit">
                                                    <FiCheckCircle className="text-emerald-500" />
                                                    <span className="text-[10px] font-black text-slate-600 tracking-tight">{payout.reference}</span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Pendiente Transferencia</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            {payout.status === 'PENDIENTE' && (
                                                <button 
                                                    onClick={() => handleFinalize(payout)}
                                                    className="px-4 py-2 bg-azul-primario text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-azul-primario/90 transition-all shadow-md shadow-azul-primario/10"
                                                >
                                                    Confirmar Pago
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Conciliación */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
                        >
                            <div className="p-8 border-b border-slate-100 bg-azul-primario/5">
                                <h3 className="text-xl font-black text-azul-primario tracking-tight flex items-center gap-3">
                                    <FiDollarSign /> Conciliar Liquidación
                                </h3>
                                <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">Ingresa la referencia de la transferencia bancaria</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Transferir a:</p>
                                        <p className="font-black text-slate-800 text-sm">{(selectedLawyer as any)?.lawyer?.nombre}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Monto Total</p>
                                        <p className="text-2xl font-black text-azul-primario tracking-tighter">{formatUSD((selectedLawyer as any)?.amount)}</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referencia Bancaria / ID Transacción</label>
                                    <input 
                                        type="text"
                                        value={reference}
                                        onChange={(e) => setReference(e.target.value)}
                                        placeholder="Ej: TRX-123456789"
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-azul-primario outline-none font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        onClick={closeModal}
                                        className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button 
                                        onClick={confirmFinalize}
                                        disabled={!reference || isProcessing}
                                        className="flex-1 py-4 bg-azul-primario text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-azul-primario/90 transition-all shadow-lg shadow-azul-primario/25 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                                    >
                                        {isProcessing ? <FiLoader className="animate-spin" /> : <FiCheckCircle />}
                                        Finalizar Pago
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
