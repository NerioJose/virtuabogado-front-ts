import { FiUsers, FiUserCheck, FiBriefcase, FiDollarSign, FiPieChart, FiSettings, FiLogOut, FiHome, FiX } from 'react-icons/fi';
import Image from 'next/image';
import { SeccionAdmin } from '@/types/index';

interface SidebarProps {
  seccionActiva: SeccionAdmin;
  setSeccionActiva: (seccion: SeccionAdmin) => void;
  handleLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ seccionActiva, setSeccionActiva, handleLogout, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div className={`
        w-64 bg-azul-primario text-white h-screen fixed left-0 top-0 overflow-y-auto z-50 transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex-1 flex justify-center lg:justify-center">
              <Image 
                src="/logo/logo_sf_1.png" 
                alt="VirtuAbogado Logo" 
                width={150} 
                height={50} 
                priority
              />
            </div>
            <button 
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <FiX size={20} />
            </button>
          </div>
        </div>
        
        <nav className="space-y-2 px-6">
          <button 
            onClick={() => setSeccionActiva('dashboard' as SeccionAdmin)}
            className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'dashboard' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
          >
            <FiHome className="text-xl" />
            <span>Dashboard</span>
          </button>
          
          <button 
            onClick={() => setSeccionActiva('abogados' as SeccionAdmin)}
            className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'abogados' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
          >
            <FiUserCheck className="text-xl" />
            <span>Abogados</span>
          </button>
          
          <button 
            onClick={() => setSeccionActiva('clientes' as SeccionAdmin)}
            className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'clientes' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
          >
            <FiUsers className="text-xl" />
            <span>Clientes</span>
          </button>
          
          <button 
            onClick={() => setSeccionActiva('casos' as SeccionAdmin)}
            className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'casos' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
          >
            <FiBriefcase className="text-xl" />
            <span>Casos</span>
          </button>
          
          <button 
            onClick={() => setSeccionActiva('finanzas' as SeccionAdmin)}
            className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'finanzas' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
          >
            <FiDollarSign className="text-xl" />
            <span>Finanzas</span>
          </button>
          
          <button 
            onClick={() => setSeccionActiva('estadisticas' as SeccionAdmin)}
            className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'estadisticas' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
          >
            <FiPieChart className="text-xl" />
            <span>Estadísticas</span>
          </button>
          
          <button 
            onClick={() => setSeccionActiva('configuracion' as SeccionAdmin)}
            className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-colors ${seccionActiva === 'configuracion' ? 'bg-white text-azul-primario' : 'hover:bg-azul-primario/80'}`}
          >
            <FiSettings className="text-xl" />
            <span>Configuración</span>
          </button>
        </nav>
        
        <div className="pt-6 mt-6 border-t border-white/20 px-6">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-600 transition-colors"
          >
            <FiLogOut className="text-xl" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}