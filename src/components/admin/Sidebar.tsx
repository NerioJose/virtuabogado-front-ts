import { FiUsers, FiUserCheck, FiBriefcase, FiDollarSign, FiPieChart, FiSettings, FiLogOut, FiHome } from 'react-icons/fi';
import Image from 'next/image';
import logo from '../../../public/logo/logo_sf_1.png';
import { SeccionAdmin } from '@/types/index';

interface SidebarProps {
  seccionActiva: SeccionAdmin;
  setSeccionActiva: (seccion: SeccionAdmin) => void;
  handleLogout: () => void;
}

export default function Sidebar({ seccionActiva, setSeccionActiva, handleLogout }: SidebarProps) {
  return (
    <div className="w-64 bg-azul-primario text-white h-screen fixed left-0 top-0 overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-center mb-8">
          <Image 
					src={logo} 
					alt="VirtuAbogado Logo" 
					width={150} 
					height={50} 
					priority
				/>
        </div>
        
        <nav className="space-y-2">
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
        
        <div className="pt-6 mt-6 border-t border-white/20">
          <button 
            onClick={handleLogout}
            className="flex items-center space-x-3 w-full p-3 rounded-lg hover:bg-red-600 transition-colors"
          >
            <FiLogOut className="text-xl" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
}