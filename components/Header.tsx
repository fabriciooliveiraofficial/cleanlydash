import React, { useState, useEffect } from 'react';
import { TabType } from '../types';
import { useRole } from '../hooks/use-role';
import { Bell, Search, Menu } from 'lucide-react';
import { CommandMenu } from './CommandMenu';

interface HeaderProps {
  activeTab: TabType;
  onNavigate?: (tab: TabType) => void;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onNavigate, onMenuClick }) => {
  const [open, setOpen] = useState(false);
  const { user, role, customRoleName } = useRole();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-20 w-full items-center justify-between px-6 transition-all md:px-8">

        <div className="flex items-center gap-4 flex-1">
          {/* Mobile Menu Trigger */}
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Menu size={24} />
          </button>

          {/* Search Bar - Trigger */}
          <button
            onClick={() => setOpen(true)}
            className="glass-panel flex items-center gap-3 rounded-2xl px-4 py-2.5 shadow-sm transition-all hover:shadow-md hover:border-white group cursor-text text-left max-w-[200px] md:max-w-none"
          >
            <Search size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
            <span className="text-sm font-medium text-slate-400 group-hover:text-slate-600 w-32 md:w-64 hidden sm:block">
              Buscar... (Cmd+K)
            </span>
            <span className="text-sm font-medium text-slate-400 group-hover:text-slate-600 sm:hidden">
              Buscar...
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <button className="relative rounded-full p-2 text-slate-500 hover:bg-white/50 hover:text-indigo-600 transition-all">
            <Bell size={20} />
            <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-rose-500 shadow-sm"></span>
          </button>

          <div className="h-8 w-px bg-slate-200/50"></div>

          <button className="flex items-center gap-3 rounded-full p-1 pr-2 hover:bg-white/50 transition-all">
            <img
              src="https://picsum.photos/32/32?random=1"
              alt="Profile"
              className="h-9 w-9 rounded-full border border-white shadow-sm"
            />
            <div className="hidden text-left md:block">
              <p className="text-xs font-bold text-[var(--text-primary)]">
                {user?.user_metadata?.full_name || 'Usuário'}
              </p>
              <p className="text-xs font-medium text-slate-500 capitalize">
                {customRoleName || (role === 'property_owner' ? 'Proprietário' : (role || 'Convidado').replace('_', ' '))}
              </p>
            </div>
          </button>
        </div>
      </header>

      <CommandMenu
        open={open}
        onOpenChange={setOpen}
        onNavigate={(tab) => {
          if (onNavigate) onNavigate(tab);
          setOpen(false);
        }}
      />
    </>
  );
};
