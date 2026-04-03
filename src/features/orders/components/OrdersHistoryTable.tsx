'use client';

import React, { useState } from 'react';
import { useOrdersHistory } from '../hooks/useOrdersHistory';
import { GetOrdersFilters } from '../actions/getOrdersHistory';
import { OrderStatus, UserRole } from '@/shared/types/entities.types';
import { 
    Search, 
    Calendar, 
    Filter, 
    ChevronLeft, 
    ChevronRight, 
    MoreHorizontal,
    Clock,
    CheckCircle2,
    AlertCircle,
    XCircle,
    RotateCcw
} from 'lucide-react';
import { formatUSD } from '@/lib/finance';

interface Props {
    user: { id: string, rol: UserRole };
}

const statusConfig: Record<OrderStatus, { label: string, color: string, icon: any }> = {
    PAGO_PENDIENTE: { label: 'Pago Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
    PAID: { label: 'Pagado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 },
    PAGO_RECHAZADO: { label: 'Pago Rechazado', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
    PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
    EN_PROGRESO: { label: 'En Progreso', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: RotateCcw },
    REVISION: { label: 'En Revisión', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: AlertCircle },
    COMPLETADO: { label: 'Completado', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    CANCELADO: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: XCircle },
    FALLIDO: { label: 'Fallido', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
};

export function OrdersHistoryTable({ user }: Props) {
    const [filters, setFilters] = useState<GetOrdersFilters>({
        page: 1,
        limit: 10,
        status: undefined,
        dateRange: undefined,
        search: '',
    });

    const { data, isLoading, isPlaceholderData } = useOrdersHistory(filters, user);

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };

    const handleFilterChange = (key: keyof GetOrdersFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
    };

    return (
        <div className="space-y-4">
            {/* Header y Filtros */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
                    <input 
                        type="text" 
                        placeholder="Buscar por ID, servicio o cliente..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Filtro de Estado */}
                    <select 
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    >
                        <option value="">Todos los estados</option>
                        {Object.entries(statusConfig).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>

                    {/* Filtro de Tiempo */}
                    <select 
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={filters.dateRange || ''}
                        onChange={(e) => handleFilterChange('dateRange', e.target.value || undefined)}
                    >
                        <option value="">Cualquier fecha</option>
                        <option value="today">Hoy</option>
                        <option value="week">Esta semana</option>
                        <option value="month">Este mes</option>
                        <option value="year">Último año</option>
                    </select>
                </div>
            </div>

            {/* VISTA MÓVIL: CARDS PREMIUM */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm animate-pulse">
                            <div className="h-4 bg-slate-100 rounded w-1/3 mb-4"></div>
                            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                        </div>
                    ))
                ) : !data || data.data.length === 0 ? (
                    <div className="bg-white rounded-[2rem] border border-slate-100 p-12 text-center">
                        <p className="text-slate-400 font-bold italic">No se encontraron registros</p>
                    </div>
                ) : (
                    data.data.map((order: any) => {
                        const status = statusConfig[order.status as OrderStatus];
                        const StatusIcon = status.icon;
                        
                        return (
                            <div key={order.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden active:scale-[0.98] transition-all">
                                {/* Header: ID & Status */}
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{order.id.slice(0, 8)}</span>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-tighter shadow-sm ${status.color}`}>
                                        <StatusIcon className="size-3" />
                                        {status.label}
                                    </span>
                                </div>

                                {/* Service Title */}
                                <h4 className="font-black text-slate-800 text-sm mb-4 leading-tight">{order.service.titulo}</h4>
                                
                                {/* Client Info */}
                                <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                    <div className="size-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm">
                                        {order.user.nombre.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-700 truncate">{order.user.nombre}</p>
                                        <p className="text-[9px] font-bold text-slate-400 truncate">{order.user.email || 'Sin email'}</p>
                                    </div>
                                </div>

                                {/* Financial Details & Date */}
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                    <div>
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Fecha</span>
                                        <span className="text-xs font-black text-slate-500">
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1 text-right">
                                            {user.rol === 'ABOGADO' ? 'Su Neto' : 'Total'}
                                        </span>
                                        <span className="text-sm font-black text-slate-900">
                                            {formatUSD(user.rol === 'ABOGADO' ? order.financials?.netoPlataforma : order.total)}
                                        </span>
                                        {user.rol === 'ABOGADO' && (
                                            <p className="text-[10px] text-rose-500 font-bold mt-0.5">Com: -{formatUSD(order.financials?.comisionLawyer || 0)}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* VISTA DESKTOP: TABLA ELEGANTE */}
            <div className="hidden md:block bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar-horizontal">
                    <div className="w-full">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-bottom border-slate-200">
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Caso / ID</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Servicio</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                                    {user.rol === 'ABOGADO' && (
                                        <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Comisión</th>
                                    )}
                                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">{user.rol === 'ABOGADO' ? 'Su Neto' : 'Monto total'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-24"></div></td>
                                            <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-32"></div></td>
                                            <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-28"></div></td>
                                            <td className="px-6 py-5"><div className="h-6 bg-slate-100 rounded-full w-20"></div></td>
                                            <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-20"></div></td>
                                            <td className="px-6 py-5"><div className="h-4 bg-slate-100 rounded w-16 ml-auto"></div></td>
                                        </tr>
                                    ))
                                ) : !data || data.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={user.rol === 'ABOGADO' ? 7 : 6} className="px-6 py-12 text-center text-slate-400 italic font-bold">
                                            No se encontraron registros.
                                        </td>
                                    </tr>
                                ) : (
                                    data.data.map((order: any) => {
                                        const status = statusConfig[order.status as OrderStatus];
                                        const StatusIcon = status.icon;
                                        
                                        return (
                                            <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${isPlaceholderData ? 'opacity-50' : ''}`}>
                                                <td className="px-6 py-5">
                                                    <div className="text-sm font-black text-slate-900">
                                                        #{order.id.slice(0, 8)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-sm text-slate-600 font-black">
                                                    {order.service.titulo}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="size-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black border border-blue-100">
                                                            {order.user.nombre.charAt(0)}
                                                        </div>
                                                        <span className="text-sm text-slate-600 font-bold">{order.user.nombre}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-tighter ${status.color}`}>
                                                        <StatusIcon className="size-3" />
                                                        {status.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-sm text-slate-500 font-bold">
                                                    {new Date(order.createdAt).toLocaleDateString('es-ES', { 
                                                        day: '2-digit', 
                                                        month: 'short', 
                                                        year: 'numeric' 
                                                    })}
                                                </td>
                                                {user.rol === 'ABOGADO' && (
                                                    <td className="px-6 py-5 text-sm font-black text-red-500 text-right">
                                                        -{formatUSD(order.financials?.comisionLawyer || 0)}
                                                    </td>
                                                )}
                                                <td className="px-6 py-5 text-sm font-black text-slate-900 text-right">
                                                    {formatUSD(user.rol === 'ABOGADO' ? order.financials?.netoPlataforma : order.total)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Paginación */}
                {!isLoading && data && data.totalPages > 1 && (
                    <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between">
                        <p className="text-sm text-slate-500">
                            Mostrando <span className="font-medium">{((filters.page - 1) * (filters.limit || 10)) + 1}</span> a <span className="font-medium">{Math.min(filters.page * (filters.limit || 10), data.total)}</span> de <span className="font-medium">{data.total}</span> resultados
                        </p>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handlePageChange(filters.page - 1)}
                                disabled={filters.page === 1}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="size-4" />
                            </button>
                            <span className="text-sm font-medium text-slate-600 px-2">
                                Página {filters.page} de {data.totalPages}
                            </span>
                            <button 
                                onClick={() => handlePageChange(filters.page + 1)}
                                disabled={filters.page === data.totalPages}
                                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="size-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

