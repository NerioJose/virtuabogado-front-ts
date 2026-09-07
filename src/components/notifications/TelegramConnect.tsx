'use client';

import React, { useEffect, useState } from 'react';
import { FiSend, FiLoader, FiCheckCircle, FiTrash2, FiLink } from 'react-icons/fi';

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

/**
 * Tarjeta para vincular el chat de Telegram del admin/abogado.
 * Permite guardar, actualizar o eliminar el telegramChatId.
 */
export default function TelegramConnect() {
    const [chatId, setChatId] = useState('');
    const [savedChatId, setSavedChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/notifications/telegram/chat')
            .then((r) => r.json())
            .then((data) => {
                if (cancelled) return;
                const saved = data?.telegramChatId || null;
                setSavedChatId(saved);
                setChatId(saved || '');
            })
            .catch(() => {
                if (!cancelled) setError('No se pudo cargar tu configuración.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const save = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch('/api/notifications/telegram/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramChatId: chatId }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.error || 'No se pudo guardar.');
            } else {
                setSavedChatId(data.telegramChatId);
                setSuccess('Chat de Telegram vinculado correctamente.');
            }
        } catch {
            setError('Error de red al guardar.');
        } finally {
            setSaving(false);
        }
    };

    const remove = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch('/api/notifications/telegram/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ telegramChatId: '' }),
            });
            if (res.ok) {
                setSavedChatId(null);
                setChatId('');
                setSuccess('Vínculo de Telegram eliminado.');
            }
        } catch {
            setError('Error de red.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 text-sm text-gray-500 flex items-center gap-2">
                <FiLoader className="animate-spin" /> Cargando configuración de Telegram...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center">
                    <FiSend size={18} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-gray-800">Notificaciones por Telegram</h3>
                    <p className="text-xs text-gray-500">
                        Recibe avisos de nuevos casos y pagos aunque no tengas la app abierta.
                    </p>
                </div>
            </div>

            {BOT_USERNAME && (
                <a
                    href={`https://t.me/${BOT_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-bold text-[#0088cc] hover:underline"
                >
                    <FiLink /> Abrir el bot y pulsar "Start"
                </a>
            )}

            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
                <li>Abre el bot de VirtuAbogado en Telegram y pulsa <b>Start</b>.</li>
                <li>Escribe a <b>@userinfobot</b> y copia tu ID numérico.</li>
                <li>Pega tu ID abajo y guarda.</li>
            </ol>

            <div className="flex gap-2">
                <input
                    type="text"
                    inputMode="numeric"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="Ej: 123456789"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-azul-primario focus:border-azul-primario outline-none"
                />
                <button
                    type="button"
                    onClick={save}
                    disabled={saving || !chatId.trim()}
                    className="px-4 py-2.5 bg-azul-primario text-white rounded-xl text-sm font-bold hover:bg-azul-oscuro transition disabled:opacity-50"
                >
                    {saving ? <FiLoader className="animate-spin" /> : 'Guardar'}
                </button>
                {savedChatId && (
                    <button
                        type="button"
                        onClick={remove}
                        disabled={saving}
                        title="Desvincular"
                        className="px-3 py-2.5 text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                        <FiTrash2 />
                    </button>
                )}
            </div>

            {savedChatId && (
                <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <FiCheckCircle /> Vinculado: <span className="font-mono">{savedChatId}</span>
                </p>
            )}
            {success && <p className="text-xs text-emerald-600 font-semibold">{success}</p>}
            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        </div>
    );
}
