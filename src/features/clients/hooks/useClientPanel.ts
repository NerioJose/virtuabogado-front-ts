import { useState, useMemo } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ServicioCliente } from '@/features/orders';

export function useClientPanel(servicios: ServicioCliente[]) {
  const [seccionActiva, setSeccionActiva] = useState('servicios');
  const [tabActivo, setTabActivo] = useState<'activos' | 'historial'>('activos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'programado' | 'revision' | 'completado' | 'cancelado'>('todos');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  
  const { changePassword, isLoading: cambiandopassword } = useAuth();
  const [passwords, setPasswords] = useState({ actual: '', nueva: '', confirmar: '' });
  const [notificacion, setNotificacion] = useState<{ tipo: 'success' | 'error', mensaje: string } | null>(null);

  const statsData = useMemo(() => ({
    total: servicios.length,
    pendientes: servicios.filter(s => s.estado === 'pendiente').length,
    programados: servicios.filter(s => s.estado === 'programado').length,
    revisiones: servicios.filter(s => s.estado === 'revision').length,
    completados: servicios.filter(s => s.estado === 'completado').length,
    cancelados: servicios.filter(s => s.estado === 'cancelado').length,
  }), [servicios]);

  const { activos, historial } = useMemo(() => {
    const term = terminoBusqueda.toLowerCase();
    const filtrados = servicios.filter(s => 
      s.nombre.toLowerCase().includes(term) || 
      s.numeroOrden.toLowerCase().includes(term)
    );

    return {
      activos: filtrados.filter(s => ['pendiente', 'programado', 'revision'].includes(s.estado)),
      historial: filtrados.filter(s => ['completado', 'cancelado'].includes(s.estado))
    };
  }, [servicios, terminoBusqueda]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.actual === '') return; // Simple validation
    
    if (passwords.nueva !== passwords.confirmar) {
      setNotificacion({ tipo: 'error', mensaje: 'Las nuevas contraseñas no coinciden' });
      return;
    }
    if (passwords.nueva.length < 6) {
      setNotificacion({ tipo: 'error', mensaje: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    try {
      await changePassword(passwords.actual, passwords.nueva);
      setNotificacion({ tipo: 'success', mensaje: 'Contraseña actualizada correctamente' });
      setPasswords({ actual: '', nueva: '', confirmar: '' });
      setTimeout(() => setNotificacion(null), 5000);
    } catch (error: any) {
      setNotificacion({ tipo: 'error', mensaje: error.message || 'Error al actualizar contraseña' });
    }
  };

  return {
    seccionActiva,
    setSeccionActiva,
    tabActivo,
    setTabActivo,
    isSidebarOpen,
    setIsSidebarOpen,
    filtroEstado,
    setFiltroEstado,
    terminoBusqueda,
    setTerminoBusqueda,
    cambiandopassword,
    passwords,
    setPasswords,
    notificacion,
    statsData,
    activos,
    historial,
    handlePasswordChange,
  };
}
