import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Globe, Lock, Bell, User, Shield, MessageSquare, CreditCard } from 'lucide-react';
import { SmtpSettings } from './SmtpSettings';
import { TelnyxSettings } from './settings/TelnyxSettings';
import { LanguageSwitcher } from './language-switcher';
import { RolesAndPermissions } from './settings/RolesAndPermissions';
import { TenantProfile } from './TenantProfile';
import { usePermission, PERMISSIONS } from '../hooks/use-permission';
import { NotificationSettings } from './settings/NotificationSettings';
import { SecuritySettings } from './settings/SecuritySettings';
import { IntegrationsSettings } from './settings/IntegrationsSettings';


type SettingsTab = 'profile' | 'smtp' | 'telnyx' | 'roles' | 'notifications' | 'integrations' | 'security';

export const Settings: React.FC = () => {
    const { t } = useTranslation();
    const { can, loading } = usePermission();
    const [activeTab, setActiveTab] = useState<SettingsTab>('smtp');

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'smtp', label: 'Email Server', icon: Mail },
        { id: 'telnyx', label: 'SMS / Voz', icon: MessageSquare }, // New Tab
        { id: 'roles', label: 'Roles & Permissions', icon: Shield },
        { id: 'integrations', label: 'Integrations', icon: CreditCard },
        { id: 'notifications', label: 'Notifications', icon: Bell },

        { id: 'security', label: 'Security', icon: Lock },
    ];

    // Filter tabs based on permissions
    const visibleTabs = tabs.filter(tab => {
        if (tab.id === 'roles') return can(PERMISSIONS.SETTINGS_MANAGE);
        if (tab.id === 'smtp') return can(PERMISSIONS.SETTINGS_MANAGE);
        if (tab.id === 'telnyx') return can(PERMISSIONS.SETTINGS_MANAGE);
        return true;
    });

    const renderContent = () => {
        switch (activeTab) {
            case 'smtp': return <SmtpSettings />;
            case 'telnyx': return <TelnyxSettings />;
            case 'roles': return <RolesAndPermissions />;
            case 'profile': return <TenantProfile />;
            case 'notifications': return <NotificationSettings />;
            case 'integrations': return <IntegrationsSettings />;
            case 'security': return <SecuritySettings />;
            default: return null;


        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-8 min-h-[600px]">
            {/* Sidebar de Configurações */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-2">
                <h1 className="text-2xl font-bold text-slate-900 mb-6 px-2">{t('settings.title', { defaultValue: 'Configurações' })}</h1>

                {loading ? (
                    // Skeleton Loader for Sidebar
                    <div className="space-y-4 pt-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
                                <div className="w-5 h-5 bg-slate-200 rounded animate-pulse" />
                                <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : (
                    visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all animate-in fade-in zoom-in-95 duration-300
                                ${activeTab === tab.id
                                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                            <tab.icon size={20} />
                            {tab.label}
                        </button>
                    ))
                )}



            </div>

            {/* Conteúdo */}
            <div className="flex-1">
                {renderContent()}
            </div>
        </div>
    );
};
