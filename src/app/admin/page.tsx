'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiUsers, FiUserCheck, FiBriefcase, FiDollarSign,
  FiPieChart, FiSettings, FiLogOut, FiSearch,
  FiPlus, FiEdit, FiTrash2, FiEye, FiCheck
} from 'react-icons/fi';

// Importar componentes
import Sidebar from '@/components/admin/Sidebar';
import DashboardStats from '@/components/admin/DashboardStats';
import AbogadosPanel from '@/components/admin/AbogadosPanel';
import ClientesPanel from '@/components/admin/ClientesPanel';
import CasosPanel from '@/components/admin/CasosPanel';
import FinanzasPanel from '@/components/admin/FinanzasPanel';
import EstadisticasPanel from '@/components/admin/EstadisticasPanel';
import ConfiguracionPanel from '@/components/admin/ConfiguracionPanel';
import ModalContainer from '@/components/admin/ModalContainer';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seccionActiva, setSeccionActiva] = useState('dashboard');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoModal, setTipoModal] = useState<'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar'>('ver');
  const [elementoSeleccionado, setElementoSeleccionado] = useState<any>(null);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');

  // Verificar autenticación y rol de administrador
  useEffect(() => {
    const verificarAdmin = async () => {
      try {
        // Para propósitos de prueba, verificamos los datos simulados en localStorage
        const userDataString = localStorage.getItem('user');

        if (!userDataString) {
          throw new Error('No autenticado');
        }

        const userData = JSON.parse(userDataString);

        if (userData.rol !== 'admin') {
          throw new Error('No autorizado');
        }

        setUser(userData);
        setLoading(false);
      } catch (error) {
        console.error('Error de autenticación:', error);
        router.push('/login');
      }
    };

    verificarAdmin();
  }, [router]);

  // Funciones para modales
  const abrirModal = (tipo: 'crear' | 'editar' | 'eliminar' | 'ver' | 'asignar', elemento?: any) => {
    setTipoModal(tipo);
    setElementoSeleccionado(elemento || null);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setElementoSeleccionado(null);
  };

  // Manejador de cierre de sesión
  const handleLogout = async () => {
    try {
      // Eliminar los datos del usuario del localStorage
      localStorage.removeItem('user');

      // Redirigir al usuario a la página de login
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-azul-primario border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-azul-primario font-medium">Cargando panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <Sidebar
        seccionActiva={seccionActiva}
        setSeccionActiva={setSeccionActiva}
        handleLogout={handleLogout}
      />

      {/* Contenido principal */}
      <div className="flex-1 ml-64">
        {/* Barra superior */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-azul-primario">
            {seccionActiva === 'dashboard' && 'Panel Principal'}
            {seccionActiva === 'abogados' && 'Gestión de Abogados'}
            {seccionActiva === 'clientes' && 'Gestión de Clientes'}
            {seccionActiva === 'casos' && 'Gestión de Casos'}
            {seccionActiva === 'finanzas' && 'Gestión Financiera'}
            {seccionActiva === 'estadisticas' && 'Estadísticas y Reportes'}
            {seccionActiva === 'configuracion' && 'Configuración'}
          </h1>

          <div className="flex items-center space-x-4">
            {seccionActiva !== 'dashboard' && seccionActiva !== 'configuracion' && (
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={terminoBusqueda}
                  onChange={(e) => setTerminoBusqueda(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-azul-primario"
                />
              </div>
            )}

            {(seccionActiva === 'abogados' || seccionActiva === 'casos') && (
              <button
                onClick={() => abrirModal('crear')}
                className="flex items-center space-x-2 bg-azul-primario text-white px-4 py-2 rounded-lg hover:bg-azul-primario/90 transition-colors"
              >
                <FiPlus />
                <span>Nuevo {seccionActiva === 'abogados' ? 'Abogado' : 'Caso'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Contenido dinámico según la sección activa */}
        <div className="p-6">
          {seccionActiva === 'dashboard' && <DashboardStats />}
          {seccionActiva === 'abogados' && (
            <AbogadosPanel
              terminoBusqueda={terminoBusqueda}
              abrirModal={abrirModal}
            />
          )}
          {seccionActiva === 'clientes' && (
            <ClientesPanel
              terminoBusqueda={terminoBusqueda}
              abrirModal={abrirModal}
            />
          )}
          {seccionActiva === 'casos' && (
            <CasosPanel
              terminoBusqueda={terminoBusqueda}
              abrirModal={abrirModal}
            />
          )}
          {seccionActiva === 'finanzas' && (
            <FinanzasPanel
              terminoBusqueda={terminoBusqueda}
              abrirModal={abrirModal}
            />
          )}
          {seccionActiva === 'estadisticas' && <EstadisticasPanel />}
          {seccionActiva === 'configuracion' && <ConfiguracionPanel />}
        </div>
      </div>

      {/* Modal dinámico */}
      {modalAbierto && (
        <ModalContainer
          tipo={tipoModal}
          seccion={seccionActiva as 'casos' | 'clientes' | 'abogados' | 'finanzas' | 'configuracion'}
          elemento={elementoSeleccionado}
          cerrarModal={cerrarModal}
        />
      )}
    </div>
  );
}