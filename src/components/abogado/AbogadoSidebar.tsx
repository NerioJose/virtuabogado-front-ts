'use client';

import { useRouter } from 'next/navigation';
import {
  FiBriefcase,
  FiCalendar,
  FiMessageSquare,
  FiUser,
  FiDollarSign,
  FiFileText,
  FiLogOut,
  FiBell,
} from 'react-icons/fi';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Abogado, SeccionAbogado } from '@/types/index';

interface AbogadoSidebarProps {
  abogado: Abogado | null;
  seccionActiva: SeccionAbogado;
  onSeccionChange: (seccion: SeccionAbogado) => void;
}

const menuItems = [
  { id: 'casos', label: 'Mis Casos', icon: FiBriefcase },
  { id: 'agenda', label: 'Agenda', icon: FiCalendar },
  { id: 'mensajes', label: 'Mensajes', icon: FiMessageSquare },
  { id: 'clientes', label: 'Mis Clientes', icon: FiUser },
  { id: 'facturacion', label: 'Facturación', icon: FiDollarSign },
  { id: 'documentos', label: 'Documentos', icon: FiFileText },
  { id: 'perfil', label: 'Mi Perfil', icon: FiUser },
];

export default function AbogadoSidebar({ abogado, seccionActiva, onSeccionChange }: AbogadoSidebarProps) {
  const router = useRouter();
  const { subscribe, isSubscribed, isPending, lastError } = usePushNotifications();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('user');
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <div className="w-64 bg-white shadow-md fixed h-full flex flex-col overflow-hidden">
      <div className="p-5 border-b border-gray-200 shrink-0">
        <h2 className="text-xl font-bold text-azul-primario">Panel Abogado</h2>
        <p className="text-xs text-gray-500 mt-1 truncate">{abogado?.nombre || 'Cargando...'}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 custom-scrollbar">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onSeccionChange(item.id as SeccionAbogado)}
                  className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                    seccionActiva === item.id
                      ? 'bg-azul-claro/20 text-azul-primario border-r-4 border-azul-primario font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 text-lg" />
                  <span className="text-sm">{item.label}</span>
                </button>
              </li>
            );
          })}
          
          {/* Botón Manual de Notificaciones Push (Fallback) */}
          <li>
            <button
              onClick={async () => {
                const success = await subscribe();
                if (success) alert('🎉 ¡Ca-Ching! Notificaciones activadas exitosamente.');
                else if (lastError) alert(`⚠️ ${lastError}`);
              }}
              disabled={isPending || isSubscribed}
              className={`w-full flex items-center px-6 py-3 text-left transition-all ${
                isSubscribed 
                  ? 'opacity-40 cursor-default grayscale' 
                  : 'text-amber-600 hover:bg-amber-50'
              }`}
            >
              <FiBell className="mr-3 text-lg" />
              <div className="flex flex-col">
                <span className="text-sm font-bold">
                    {isSubscribed ? 'Notificaciones Activas' : 'Activar Notificaciones'}
                </span>
                {!isSubscribed && <span className="text-[9px] opacity-70 uppercase font-black tracking-tight">Manual Ca-Ching 💰</span>}
              </div>
            </button>
          </li>

          {/* Botón de Diagnóstico Directo (Temporal para Pruebas) */}
          <li>
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/notifications/test-push', { method: 'POST' });
                  const result = await response.json();
                  if (result.success) alert('🧪 Servidor dice: ' + result.message);
                  else alert('❌ Error en el servidor: ' + (result.message || result.error));
                } catch (err) {
                  alert('🚨 Error de red: ' + (err instanceof Error ? err.message : String(err)));
                }
              }}
              className="w-full flex items-center px-6 py-3 text-left transition-all text-emerald-600 hover:bg-emerald-50 border-t border-gray-100"
            >
              <span className="mr-3">🛠️</span>
              <span className="text-xs font-bold uppercase">PRUEBA PUSH</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold text-sm"
        >
          <FiLogOut className="mr-3 text-lg" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}