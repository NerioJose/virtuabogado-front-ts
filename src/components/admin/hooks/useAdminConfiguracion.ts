import { useState } from 'react';

export type TabType = 'perfil' | 'financiero' | 'servicios';

export function useAdminConfiguracion() {
    const [activeTab, setActiveTab] = useState<TabType>('servicios');

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
    };

    return {
        activeTab,
        handleTabChange,
    };
}
