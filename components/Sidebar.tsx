import React from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from './language-switcher.tsx';
import { TabType } from '../types.ts';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Wallet as WalletIcon,
  Settings,
  LogOut,
  Plane,
  PhoneCall,
  Sparkles,
  Map,
  Package,
  DollarSign,
  LifeBuoy
} from 'lucide-react';
import { createClient } from '../lib/supabase/client.ts';

import { usePermission, PERMISSIONS } from '../hooks/use-permission.ts';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isOpen?: boolean;
  onClose?: () => void;
  // Extra props for mobile handling that seem to be passed but not defined
  isMobileOpen?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, isOpen, onClose, isMobileOpen, isCollapsed, onToggleCollapse }) => {
  const supabase = createClient();
  const { can } = usePermission();
  const { t } = useTranslation();

  // Define base items with required permissions
  const allItems = [
    { id: TabType.OVERVIEW, icon: LayoutDashboard, label: t('sidebar.dashboard'), permission: PERMISSIONS.TASKS_VIEW }, // Basic access
    { id: TabType.BOOKINGS, icon: CalendarDays, label: t('sidebar.bookings'), permission: PERMISSIONS.TASKS_VIEW },
    { id: TabType.CUSTOMERS, icon: Users, label: t('sidebar.customers'), permission: PERMISSIONS.CUSTOMERS_VIEW },
    { id: TabType.TEAM, icon: Users, label: t('sidebar.team', { defaultValue: 'Equipe' }), permission: PERMISSIONS.TEAM_VIEW },
    { id: TabType.PAYROLL, icon: WalletIcon, label: t('sidebar.payroll', { defaultValue: 'Folha Pagamento' }), permission: PERMISSIONS.PAYROLL_VIEW },
    { id: TabType.MAP_VIEW, icon: Map, label: t('sidebar.map', { defaultValue: 'Mapa' }), permission: PERMISSIONS.TASKS_VIEW },
    { id: TabType.WALLET, icon: WalletIcon, label: t('sidebar.wallet', { defaultValue: 'Carga de Créditos' }), permission: PERMISSIONS.FINANCE_VIEW_BALANCE },
    { id: TabType.FINANCE, icon: DollarSign, label: t('sidebar.finance', { defaultValue: 'Financeiro' }), permission: PERMISSIONS.FINANCE_VIEW_BALANCE },
    { id: TabType.TELEPHONY, icon: PhoneCall, label: t('sidebar.telephony'), permission: PERMISSIONS.CUSTOMERS_VIEW },
    { id: TabType.SUPPORT, icon: LifeBuoy, label: t('sidebar.support', { defaultValue: 'Ajuda & Suporte' }), permission: PERMISSIONS.TASKS_VIEW }, // Basic permission for now
    { id: TabType.RESOURCES, icon: Package, label: t('sidebar.resources', { defaultValue: 'Recursos' }), permission: PERMISSIONS.TEAM_VIEW },
    { id: TabType.AI_INSIGHTS, icon: Sparkles, label: t('sidebar.ai_insights', { defaultValue: 'AI Insights' }), permission: PERMISSIONS.SETTINGS_VIEW }, // Admin level
  ];

  // Filter items based on permissions
  const visibleItems = allItems.filter(item => can(item.permission));

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn('Sign out aborted (safe to ignore)');
      } else {
        console.error('Error signing out:', error);
      }
    } finally {
      // Force cleanup to ensure logout happens visually
      const keys = Object.keys(localStorage).filter(k =>
        k.startsWith('sb-') || k.includes('supabase')
      );
      keys.forEach(k => localStorage.removeItem(k));
      window.location.href = '/';
    }
  };

  const contentMarkup = (
    <>
      <div className={`flex h-20 items-center ${isCollapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
            <Plane size={20} className="transform -rotate-12" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <span className="text-lg font-bold tracking-tight text-[var(--text-primary)] leading-none">Cleanlydash</span>
              <span className="text-[10px] font-medium text-[var(--text-secondary)] tracking-wide uppercase">
                PRO SUITE
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-4 overflow-y-auto custom-scrollbar">
        <p className="px-3 mb-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest opacity-80">Menu</p>

        {/* Loading Skeleton */}
        {visibleItems.length === 0 && (
          <div className="space-y-2 px-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex h-11 w-full animate-pulse items-center gap-3 rounded-xl bg-slate-100/50 px-4">
                <div className="h-4 w-4 rounded bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-200" />
              </div>
            ))}
          </div>
        )}

        {visibleItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => {
              onTabChange(item.id);
              if (onClose) onClose();
            }}
            title={isCollapsed ? item.label : undefined}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`flex w-full items-center rounded-xl py-3 text-[13px] font-bold transition-all duration-300 animate-in fade-in slide-in-from-left-2 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'
              } ${activeTab === item.id
                ? 'bg-white/90 text-indigo-700 shadow-md backdrop-blur-md border border-indigo-100'
                : 'text-slate-600 hover:bg-white/40 hover:text-slate-900 shadow-sm border border-transparent hover:border-white/40'
              }`}
          >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <item.icon size={18} className={activeTab === item.id ? 'text-indigo-600' : 'text-slate-500'} />
              {!isCollapsed && <span>{item.label}</span>}
            </div>
            {activeTab === item.id && !isCollapsed && (
              <div className="h-2 w-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/50" />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto p-4 space-y-1">
        <div className={`flex items-center mb-2 ${isCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
          {!isCollapsed && <span className="text-xs font-semibold text-slate-400">{t('settings.language')}</span>}
          <LanguageSwitcher showLabel={!isCollapsed} />
        </div>
        {can(PERMISSIONS.SETTINGS_VIEW) && (
          <button
            onClick={() => {
              onTabChange(TabType.SETTINGS);
              if (onClose) onClose();
            }}
            title={isCollapsed ? t('sidebar.settings') : undefined}
            className={`flex w-full items-center gap-3 rounded-xl py-3 text-[13px] font-semibold transition-all ${isCollapsed ? 'justify-center px-0' : 'px-4'
              } ${activeTab === TabType.SETTINGS
                ? 'bg-white/90 text-indigo-700 shadow-md backdrop-blur-md border border-indigo-100'
                : 'text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]'}`}
          >
            <Settings size={18} />
            {!isCollapsed && t('sidebar.settings')}
          </button>
        )}
        <button
          onClick={handleSignOut}
          title={isCollapsed ? "Encerrar Sessão" : undefined}
          className={`flex w-full items-center gap-3 rounded-xl py-3 text-[13px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors ${isCollapsed ? 'justify-center px-0' : 'px-4'
            }`}
        >
          <LogOut size={18} />
          {!isCollapsed && <span>Encerrar Sessão</span>}
        </button>

        {/* Toggle Collapse Button (Desktop Only) */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex w-full items-center justify-center p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mt-2"
        >
          <div className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </div>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`glass-panel m-4 hidden flex-col rounded-2xl md:flex sticky top-4 h-[calc(100vh-32px)] z-40 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        {contentMarkup}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          ></div>

          {/* Drawer */}
          <aside className="relative flex w-64 flex-col bg-white/95 backdrop-blur-xl h-full shadow-2xl animate-in slide-in-from-left duration-300">
            {contentMarkup}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
