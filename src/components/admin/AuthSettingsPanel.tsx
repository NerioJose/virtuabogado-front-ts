'use client';

import { FiMail, FiCheck } from 'react-icons/fi';
import { toast } from 'sonner';
import {
    useAuthSettings,
    useUpdateAuthSettings,
} from '@/features/auth-settings/hooks/useAuthSettings';

export default function AuthSettingsPanel() {
    const { data, isLoading, error } = useAuthSettings();
    const updateSettings = useUpdateAuthSettings();
    const requireConfirmation = data?.requireEmailConfirmation ?? false;

    const handleToggle = () => {
        updateSettings.mutate(!requireConfirmation, {
            onSuccess: (result) => {
                toast.success(
                    result.requireEmailConfirmation
                        ? 'Confirmación de correo activada'
                        : 'Confirmación de correo desactivada',
                );
            },
            onError: (err) => {
                toast.error(
                    err instanceof Error
                        ? err.message
                        : 'No se pudo actualizar la configuración',
                );
            },
        });
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-gray-400 italic">
                Cargando configuración de autenticación...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-red-700 text-sm">
                No se pudo cargar la configuración de autenticación.
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 max-w-2xl">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-green-50/50">
                <div className="flex items-center">
                    <FiMail className="text-azul-primario text-2xl mr-3" />
                    <div>
                        <h2 className="text-lg font-bold text-azul-primario">
                            Autenticación y Registro
                        </h2>
                        <p className="text-xs text-gray-500">
                            Controla la confirmación de correo al crear una cuenta.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 flex items-start justify-between gap-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">
                        Requerir confirmación de correo
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed mt-1">
                        Activado: el cliente recibe un enlace y debe confirmarlo antes de
                        ingresar. Desactivado: puede ingresar inmediatamente después de
                        registrarse.
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                        Los usuarios antiguos sin confirmar se confirmarán automáticamente
                        al intentar ingresar mientras esta opción esté desactivada.
                    </p>
                </div>

                <button
                    type="button"
                    role="switch"
                    aria-checked={requireConfirmation}
                    aria-label="Requerir confirmación de correo"
                    onClick={handleToggle}
                    disabled={updateSettings.isPending}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                        requireConfirmation ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                            requireConfirmation ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>

            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center gap-2">
                <FiCheck /> El cambio se aplica de inmediato a los nuevos registros.
            </div>
        </div>
    );
}
