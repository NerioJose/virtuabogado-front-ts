'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    className?: string;
}

function getPageItems(current: number, total: number): (number | '...')[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const items: (number | '...')[] = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    if (start > 2) items.push('...');
    for (let i = start; i <= end; i++) items.push(i);
    if (end < total - 1) items.push('...');
    items.push(total);

    return items;
}

export default function Pagination({ page, totalPages, total, pageSize, onPageChange, className = '' }: PaginationProps) {
    if (totalPages <= 1) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    return (
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 bg-white border-t border-slate-100 ${className}`}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">
                Mostrando <span className="text-slate-700">{from}</span> - <span className="text-slate-700">{to}</span> de <span className="text-slate-700">{total}</span>
            </p>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    aria-label="Página anterior"
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-azul-primario disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
                >
                    <FiChevronLeft size={16} />
                </button>

                <div className="hidden sm:flex items-center gap-1.5">
                    {getPageItems(page, totalPages).map((item, idx) =>
                        item === '...' ? (
                            <span key={`e${idx}`} className="px-1 text-xs font-black text-slate-400">...</span>
                        ) : (
                            <button
                                key={item}
                                type="button"
                                onClick={() => onPageChange(item)}
                                className={`min-w-[36px] h-9 px-2 rounded-xl text-xs font-black transition active:scale-95 ${
                                    item === page
                                        ? 'bg-azul-primario text-white shadow-lg shadow-azul-primario/20'
                                        : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-azul-primario'
                                }`}
                            >
                                {item}
                            </button>
                        )
                    )}
                </div>

                <span className="sm:hidden text-xs font-black text-slate-500 px-2">{page} / {totalPages}</span>

                <button
                    type="button"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Página siguiente"
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-azul-primario disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
                >
                    <FiChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}