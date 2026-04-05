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
  FiPlayCircle
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
          
          {/* Botones de Notificación: Reparar + Probar */}
          <li className="px-4 py-2 mt-2">
            <div className="flex gap-1">
              <button
                onClick={async () => {
                  const success = await subscribe(isSubscribed);
                  if (success) alert('🎉 ¡Sincronizado! Ya puedes recibir alertas de casos.');
                  else if (lastError) alert(`⚠️ ${lastError}`);
                }}
                disabled={isPending}
                className={`flex-1 flex items-center px-4 py-3 rounded-xl transition-all border ${
                  isPending 
                    ? 'opacity-40 cursor-wait bg-gray-50' 
                    : 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100'
                }`}
              >
                <FiBell className="mr-2 text-lg shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-black uppercase tracking-tight">
                    {isSubscribed ? 'REPARAR' : 'ACTIVAR'}
                  </span>
                  <span className="text-[7px] font-bold opacity-60 uppercase">Notificaciones</span>
                </div>
              </button>

              {isSubscribed && (
                <button
                  onClick={async () => {
                    const response = await fetch('/api/notifications/test-push', { method: 'POST' });
                    const data = await response.json();
                    if (data.success) alert(data.message);
                    else alert(`❌ ${data.error || 'Error al probar'}`);
                  }}
                  className="px-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100 flex items-center justify-center group"
                  title="Ejecutar Prueba"
                >
                  <FiPlayCircle className="text-lg group-hover:scale-110 transition-transform" />
                  <span className="ml-1 text-[8px] font-black uppercase">Test</span>
                </button>
              )}
            </div>
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