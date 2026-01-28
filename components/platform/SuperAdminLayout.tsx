import React from 'react';
import {
    LayoutDashboard,
    Users,
    CreditCard,
    Settings,
    ShieldAlert,
    Activity,
    LogOut,
    Globe,
    MessageSquare,
    Phone,
    Megaphone
} from 'lucide-react';

import { createPlatformClient } from '../../lib/supabase/platform-client';

interface SuperAdminLayoutProps {
    children: React.ReactNode;
    activeModule: 'dashboard' | 'tenants' | 'finance' | 'system' | 'logs' | 'support' | 'broadcast' | 'telephony';
    onNavigate: (module: 'dashboard' | 'tenants' | 'finance' | 'system' | 'logs' | 'support' | 'broadcast' | 'telephony') => void;

}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({ children, activeModule, onNavigate }) => {
    const supabase = createPlatformClient(); // ISOLATED CLIENT

    const [isLoggingOut, setIsLoggingOut] = React.useState(false); // Add state for visual feedback

    React.useEffect(() => {
        console.log("SuperAdminLayout v4.1 (Logout Fix) Loaded");
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        console.log("Logout v7: Total Key Annihilation");

        if (typeof window !== 'undefined') {
            // 1. Supabase SignOut (Fire and forget, but isolated)
            supabase.auth.signOut().catch(() => { });

            // 2. Clear SPECIFIC LocalStorage keys as well as all
            const keysToClear = [
                'sb-tenant-auth-token',
                'sb-platform-auth-token',
                'sb-cleaner-auth-token',
                'sb-jjbokilvurxztqiwvxhy-auth-token' // Legacy/Default
            ];

            keysToClear.forEach(key => window.localStorage.removeItem(key));
            window.localStorage.clear(); // Nuclear fallback
            window.sessionStorage.clear();

            // 3. Clear SPECIFIC Cookies with full path/domain visibility
            const cookieNames = [
                'sb-tenant-auth-token',
                'sb-platform-auth-token',
                'sb-cleaner-auth-token',
                'sb-jjbokilvurxztqiwvxhy-auth-token'
            ];

            cookieNames.forEach(name => {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/platform;`;
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/cleaner;`;
            });

            // 4. Force Redirect
            window.location.href = '/platform/login?logged_out=' + Date.now();
        }
    };

    const NavItem = ({ module, icon: Icon, label }: { module: any, icon: any, label: string }) => (
        <button
            onClick={() => onNavigate(module)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${activeModule === module
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
        >
            <Icon size={18} />
            {label}
        </button>
    );

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Sidebar - Dark Mode for "Hacker/God Mode" feel */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-400 mb-1">
                        <ShieldAlert size={20} />
                        <span className="font-bold tracking-wider text-xs uppercase">God Mode</span>
                    </div>
                    <h1 className="text-xl font-bold">Cleanlydash Ops</h1>
                </div>

                <nav className="flex-1 py-4">
                    <NavItem module="dashboard" icon={LayoutDashboard} label="Mission Control" />
                    <NavItem module="tenants" icon={Users} label="Tenant Manager" />
                    <NavItem module="finance" icon={CreditCard} label="Financial Command" />
                    <NavItem module="system" icon={Settings} label="System & Flags" />
                    <NavItem module="logs" icon={Activity} label="Audit Logs" />
                    <div className="my-2 border-t border-slate-800 mx-4"></div>
                    <NavItem module="support" icon={MessageSquare} label="Support Inbox" />
                    <NavItem module="telephony" icon={Phone} label="Telephony Manager" />
                    <NavItem module="broadcast" icon={Megaphone} label="Broadcast Center" />

                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="bg-slate-800 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                            <Globe size={12} />
                            <span>Global Status: Healthy</span>
                        </div>
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-full animate-pulse"></div>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm px-2 transition-colors disabled:opacity-50"
                    >
                        <LogOut size={16} />
                        {isLoggingOut ? 'Saindo...' : 'Secure Logout'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-800">
                        {activeModule === 'dashboard' && 'Dashboard Overview'}
                        {activeModule === 'tenants' && 'Global Tenant Management'}
                        {activeModule === 'finance' && 'Revenue & Billing'}
                        {activeModule === 'system' && 'System Configuration'}
                        {activeModule === 'logs' && 'Security Audit Logs'}
                        {activeModule === 'support' && 'Support & Ticketing'}
                        {activeModule === 'telephony' && 'AI Telephony Operations'}
                        {activeModule === 'broadcast' && 'System Broadcasts'}

                    </h2>
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">
                            v2.0.0-alpha
                        </span>
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs ring-2 ring-indigo-600 ring-offset-2">
                            SA
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};
