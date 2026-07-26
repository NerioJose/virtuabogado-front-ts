'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiBriefcase, 
  FiSearch, 
  FiUser, 
  FiHelpCircle, 
  FiLogOut, 
  FiX, 
  FiMessageSquare,
  FiHome
} from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import PushNotificationToggle from '@/components/notifications/PushNotificationToggle';
import { useClientSidebar } from '../hooks/useClientSidebar';

const ICON_MAP: Record<string, React.ReactNode> = {
  FiBriefcase: <FiBriefcase />,
  FiSearch: <FiSearch />,
  FiMessageSquare: <FiMessageSquare />,
  FiUser: <FiUser />,
  FiHelpCircle: <FiHelpCircle />
};

interface ClientSidebarProps {
  seccionActiva: string;
  setSeccionActiva: (id: string) => void;
  handleLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  userPicture?: string;
}

export default function ClientSidebar({
  seccionActiva,
  setSeccionActiva,
  handleLogout,
  isOpen,
  onClose,
  userName,
  userEmail,
  userPicture
}: ClientSidebarProps) {
  const { navItems, handleNavItemClick } = useClientSidebar(seccionActiva, setSeccionActiva, onClose);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Header / Logo */}
      <div className="p-4 px-6 border-b border-slate-100 flex justify-between items-center bg-azul-primario/[0.02] shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-azul-primario rounded-2xl flex items-center justify-center text-white shadow-lg shadow-azul-primario/20">
            <FiHome size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-azul-primario tracking-tight leading-none">VirtuAbogado</h2>
            <p className="text-[10px] uppercase font-black text-slate-400 mt-1 tracking-widest">Portal de Cliente</p>
          </div>
        </Link>
        <button type="button" 
          onClick={onClose}
          className="lg:hidden p-2 text-slate-400 hover:text-rose-500 transition-colors"
        >
          <FiX size={24} />
        </button>
      </div>

      {/* User Info (Premium) */}
      <div className="p-4 px-6 shrink-0">
        <div className="p-3 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            {userPicture ? (
              <Image src={userPicture} alt={userName} width={48} height={48} className="w-full h-full object-cover" />
            ) : (
              <FiUser className="text-azul-primario" size={24} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 truncate tracking-tight">{userName}</p>
            <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter">{userEmail}</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-2 overflow-y-auto no-scrollbar">
        <ul className="space-y-1.5">
          {navItems.map((item) => (
            <li key={item.id} className={item.divider ? 'pt-6 mt-4 border-t border-slate-100' : ''}>
              {item.href ? (
                <Link href={item.href} className="flex items-center px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-azul-primario transition group">
                  <span className="text-lg mr-3 text-slate-400 group-hover:scale-110 transition-transform">
                    {ICON_MAP[item.icon]}
                  </span>
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                </Link>
              ) : (
                <button type="button"
                  onClick={() => handleNavItemClick(item.id)}
                  className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition duration-200 group ${
                    seccionActiva === item.id
                      ? 'bg-azul-primario text-white shadow-lg shadow-azul-primario/25 translate-x-2'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-azul-primario'
                  }`}
                >
                  <span className={`text-lg mr-3 transition-transform group-hover:scale-110 ${
                    seccionActiva === item.id ? 'text-white' : 'text-slate-400'
                  }`}>
                    {ICON_MAP[item.icon]}
                  </span>
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 px-6 border-t border-slate-50 shrink-0 space-y-3">
        <PushNotificationToggle />
        
        <button type="button"
          onClick={handleLogout}
          className="w-full flex items-center px-6 py-4 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-[2rem] transition group font-black text-xs uppercase tracking-widest shadow-sm"
        >
          <FiLogOut className="mr-3 group-hover:-translate-x-1 transition-transform text-lg" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Desktop & Mobile */}
      <aside 
        className={`
          fixed top-0 left-0 h-full w-72 z-[70] transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
