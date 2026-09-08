import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { ServicioCliente } from '@/features/orders';

const PAGE_SIZE = 12;

export function useClientPanel(servicios: ServicioCliente[]) {
  const [seccionActiva, setSeccionActiva] = useState('servicios');
  const [tabActivo, setTabActivo] = useState<'activos' | 'historial'>('activos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'pendiente' | 'programado' | 'revision' | 'completado' | 'cancelado'>('todos');
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [page, setPage] = useState(1);

  const { changePassword, isLoading: cambiandopassword } = useAuth();
  const [passwords, setPasswords] = useState({ actual: '', nueva: '', confirmar: '' });
  const [notificacion, setNotificacion] = useState<{ tipo: 'success' | 'error', mensaje: string } | null>(null);

  useEffect(() => {
    setPage(1);
  }, [tabActivo, filtroEstado, terminoBusqueda]);

  const statsData = useMemo(() => ({
    total: servicios.length,
    pendientes: servicios.filter(s => s.estado === 'pendiente').length,
    programados: servicios.filter(s => s.estado === 'programado').length,
    revisiones: servicios.filter(s => s.estado === 'revision').length,
    completados: servicios.filter(s => s.estado === 'completado').length,
    cancelados: servicios.filter(s => s.estado === 'cancelado').length,
  }), [servicios]);

  const { activosAll, historialAll } = useMemo(() => {
    const term = terminoBusqueda.toLowerCase();
    const filtrados = servicios.filter(s => 
      s.nombre.toLowerCase().includes(term) || 
      s.numeroOrden.toLowerCase().includes(term)
    );

    return {
      activosAll: filtrados.filter(s => ['pendiente', 'programado', 'revision'].includes(s.estado)),
      historialAll: filtrados.filter(s => ['completado', 'cancelado'].includes(s.estado))
    };
  }, [servicios, terminoBusqueda]);

  const activosFiltrados = useMemo(() =>
    activosAll.filter(s => filtroEstado === 'todos' || s.estado === filtroEstado),
    [activosAll, filtroEstado]
  );

  const historialFiltrados = useMemo(() =>
    historialAll.filter(s => filtroEstado === 'todos' || s.estado === filtroEstado),
    [historialAll, filtroEstado]
  );

  const activosTotal = activosFiltrados.length;
  const historialTotal = historialFiltrados.length;

  const activos = useMemo(() => {
    if (activosTotal <= PAGE_SIZE) return activosFiltrados;
    return activosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [activosFiltrados, activosTotal, page]);

  const historial = useMemo(() => {
    if (historialTotal <= PAGE_SIZE) return historialFiltrados;
    return historialFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [historialFiltrados, historialTotal, page]);

  const totalActual = tabActivo === 'activos' ? activosTotal : historialTotal;
  const totalPages = Math.max(1, Math.ceil(totalActual / PAGE_SIZE));

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
    activosTotal,
    historialTotal,
    totalActual,
    totalPages,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    handlePasswordChange,
  };
}
