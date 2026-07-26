'use client';

import { useState, useEffect } from 'react';
import { getPayoutHistory } from '../actions/payoutActions';
import { formatUSD } from '@/lib/finance';
import { 
    FiCheckCircle, 
    FiClock, 
    FiCalendar, 
    FiDollarSign,
    FiLoader,
    FiFileText
} from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

interface PayoutHistoryListProps {
    lawyerId: string;
}

export default function PayoutHistoryList({ lawyerId }: PayoutHistoryListProps) {
    const { data: payouts = [], isLoading: loading } = useQuery({
        queryKey: ['PayoutHistory', lawyerId],
        queryFn: () => getPayoutHistory(lawyerId),
        enabled: !!lawyerId
    });

    if (loading) {
        return (
            <div className="col-span-full flex justify-center py-10">
                <FiLoader className="animate-spin text-azul-primario" size={32} />
            </div>
        );
    }

    if (payouts.length === 0) {
        return (
            <div className="col-span-full py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <FiDollarSign className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Aún no has recibido liquidaciones</p>
            </div>
        );
    }

    return (
        <>
            {payouts.map((payout: any, idx: number) => (
                <motion.div 
                    key={payout.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <FiCheckCircle size={60} />
                    </div>

                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Liquidación</p>
                            <h4 className="text-xl font-black text-slate-900 tracking-tighter">
                                {formatUSD(payout.amount)}
                            </h4>
                        </div>
                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${
                            payout.status === 'COMPLETADO' 
                                ? 'bg-emerald-50 text-emerald-600' 
                                : 'bg-emerald-50 text-emerald-500'
                        }`}>
                            {payout.status === 'COMPLETADO' ? 'Liquidada' : 'Autorizada'}
                        </span>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-3">
                            <FiCalendar className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-500">{new Date(payout.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</span>
                        </div>
                        <div className="flex flex-col gap-1.5 pl-7 border-l border-slate-100 ml-2 mt-1 mb-4">
                            {payout.orders?.map((order: any) => (
                                <div key={order.id} className="flex justify-between items-center">
                                    <span className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">
                                        {order.service?.titulo}
                                    </span>
                                    <span className="text-[9px] font-black text-slate-300">
                                        {formatUSD(Number(order.commissionAmount))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-50">
                        {payout.reference ? (
                            <div className="flex flex-col gap-1">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Ref. Bancaria</p>
                                <p className="text-xs font-black text-slate-700 truncate">{payout.reference}</p>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-emerald-500">
                                <FiCheckCircle size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Pago Autorizado</span>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </>
    );
}
