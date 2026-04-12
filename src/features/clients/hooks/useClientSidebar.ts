import { useMemo } from 'react';

export function useClientSidebar(
    seccionActiva: string,
    setSeccionActiva: (id: string) => void,
    onClose: () => void
) {
    const navItems = useMemo(() => [
        { id: 'servicios', label: 'Mis Servicios', icon: 'FiBriefcase' },
        { id: 'explorar', label: 'Contratar Nuevo', icon: 'FiSearch', href: '/servicios' },
        { id: 'mensajes', label: 'Mensajes', icon: 'FiMessageSquare' },
        { id: 'perfil', label: 'Mi Perfil', icon: 'FiUser', divider: true },
        { id: 'ayuda', label: 'Centro de Ayuda', icon: 'FiHelpCircle' },
    ], []);

    const handleNavItemClick = (id: string) => {
        setSeccionActiva(id);
        onClose();
    };

    return {
        navItems,
        handleNavItemClick,
    };
}
