import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Header } from './Header.tsx';
import { Overview } from './Overview.tsx';
import { Bookings } from './Bookings.tsx';
import { Customers } from './Customers.tsx';
import { Team } from './Team.tsx';
import { PayrollDashboard } from './team/PayrollDashboard.tsx';
import { Settings } from './Settings.tsx';
import { MapView } from './MapView.tsx';
import { Wallet } from './Wallet.tsx';
import { LandingPage } from './LandingPage.tsx';
import { FeaturesPage } from './FeaturesPage.tsx';
import { SystemDiagnostics } from './SystemDiagnostics';
import { AuthFlow } from './AuthFlow.tsx';
import { UnifiedInbox } from './telephony/UnifiedInbox.tsx';
import { TelephonyHub } from './telephony/TelephonyHub.tsx';
import { Resources } from './Resources.tsx';
import { NotificationInbox } from './notifications/NotificationInbox.tsx';
import AirbnbDispatch from './AirbnbDispatch.tsx';
import { TelnyxProvider } from '../contexts/telnyx-context.tsx';
import { CommandMenu } from './CommandMenu.tsx';
import { TabType } from '../types.ts';
import { toast, Toaster } from 'sonner';
import { Plane, Users, Wallet as WalletIcon, DollarSign, PhoneCall, LifeBuoy, Package, Sparkles, Map, Menu, Search, Bell } from 'lucide-react';
import { SessionTracker } from './system/SessionTracker';
import { useRole } from '../hooks/use-role.ts';
import { usePermission } from '../hooks/use-permission.ts';
import { AcceptInvite } from './AcceptInvite.tsx';
import { TenantOnboarding } from './TenantOnboarding.tsx';
import { PaymentLinkManager } from './commerce/PaymentLinkManager.tsx';
import { PaymentSuccessPage } from './commerce/PaymentSuccessPage.tsx';
import { PublicInvoicePage } from './commerce/PublicInvoicePage.tsx';
import { TenantSupport } from './support/TenantSupport.tsx';
import { SubscriptionGate } from './subscription/SubscriptionGate'; // Import Gateway
import { SessionGuard } from './system/SessionGuard.tsx';
import { DialerWidget } from './telephony/dialer-widget.tsx';
import { RoleProvider } from '../contexts/RoleContext';
import { AnimatePresence, motion } from 'framer-motion';
import { PortalSupportHUD } from './support/PortalSupportHUD.tsx';
import { PortalTransition } from './support/PortalTransition.tsx';
import { MirrorEmitter } from './support/MirrorEmitter.tsx';
import { ReleaseGuard } from './system/ReleaseGuard.tsx';

const TenantAppInner: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>(TabType.OVERVIEW);
    const [view, setView] = useState<'landing' | 'auth' | 'dashboard' | 'features'>('landing');
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);
    const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('register');

    const roleContext = useRole();
    const { role, user, loading: roleLoading } = roleContext;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

    useEffect(() => {
        // Only allow dashboard access if the role explicitly provides 'dashboard' access
        const hasDashboardAccess = user && roleContext.app_access === 'dashboard';

        if (hasDashboardAccess) {
            if (view === 'landing' || view === 'auth') {
                setView('dashboard');
            }
        } else {
            // If user exists but lacks dashboard access (e.g. Platform Admin),
            // keep them on landing/auth and show a warning if they are trying to reach dashboard
            if (!roleLoading && view === 'dashboard') {
                setView('landing');
                if (user) {
                    toast.error("Acesso Negado: Sua função não possui permissão para o Dashboard desta empresa.");
                }
            }
        }

        if ('serviceWorker' in navigator && user && (role === 'cleaner' || role === 'staff')) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('Push SW Registered:', reg.scope))
                .catch(err => console.error('Push SW Registration failed:', err));
        }
    }, [user, role, roleLoading, view, roleContext.app_access]);

    const renderDashboardContent = () => {
        switch (activeTab) {
            case TabType.OVERVIEW: return <Overview />;
            case TabType.BOOKINGS: return <Bookings />;
            case TabType.CUSTOMERS: return <Customers />;
            case TabType.TEAM: return <Team onNavigate={setActiveTab} />;
            case TabType.PAYROLL: return <PayrollDashboard />;
            case TabType.SETTINGS: return <Settings />;
            case TabType.MAP_VIEW: return <MapView />;
            case TabType.WALLET: return <Wallet />;
            case TabType.FINANCE: return <PaymentLinkManager />;
            case TabType.TELEPHONY: return <UnifiedInbox />;
            case TabType.TELEPHONY_HUB: return <TelephonyHub />;
            case TabType.SUPPORT: return <TenantSupport />;
            case TabType.RESOURCES: return <Resources />;
            case TabType.AIRBNB_CENTER: return <AirbnbDispatch />;
            default: return <Overview />;
        }
    };

    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const inviteToken = params.get('token');
    const isInvited = params.get('invited') === 'true';

    const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(p => p !== '') : [];
    const reservedRoutes = ['auth', 'dashboard', 'settings', 'team', 'bookings', 'debug', 'payment-success', 'invoice', 'callback', 'platform', 'admin', 'cleaner'];

    const isTenantJoinRoute = pathParts.length === 2 && pathParts[1] === 'join';
    const isTenantRootRoute = pathParts.length === 1 && !reservedRoutes.includes(pathParts[0]);

    if (isTenantJoinRoute || isTenantRootRoute) {
        return <TenantOnboarding onLoginRequest={() => { window.location.href = '/auth' }} />;
    }

    if (window.location.pathname === '/payment-success') {
        return <PaymentSuccessPage />;
    }

    if (window.location.pathname.startsWith('/invoice/')) {
        return <PublicInvoicePage />;
    }

    if (window.location.pathname === '/debug') {
        return <SystemDiagnostics />;
    }

    if (inviteToken || isInvited) {
        return <AcceptInvite
            onSuccess={() => {
                window.history.replaceState(null, '', window.location.pathname);
                setView(user ? 'dashboard' : 'auth');
            }}
            onLoginRequest={() => setView('auth')}
        />;
    }

    const permissionContext = usePermission();

    if (roleLoading || (user && (roleContext.loading || permissionContext.loading))) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
                    <div className="relative">
                        <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 flex items-center justify-center p-2">
                            <img src="/favicon.png" alt="Loading" className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="text-center space-y-1">
                        <h2 className="text-lg font-bold text-slate-900">Cleanlydash</h2>
                        <p className="text-sm font-medium text-slate-400">Preparando sua experiência premium...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'auth' && !user) {
        return (
            <AuthFlow
                onBack={() => setView('landing')}
                onAuthenticated={() => setView('dashboard')}
                selectedPlan={selectedPlan}
                initialMode={authMode}
            />
        );
    }

    if (view === 'landing') {
        return (
            <LandingPage
                onStart={(planId) => {
                    setSelectedPlan(planId);
                    setAuthMode('register');
                    setView('auth');
                }}
                onLogin={() => {
                    setSelectedPlan(undefined);
                    setAuthMode('login');
                    setView('auth');
                }}
                onFeatures={() => setView('features')}
            />
        );
    }

    if (view === 'features') {
        return (
            <FeaturesPage
                onBack={() => setView('landing')}
                onStart={() => {
                    setView('auth');
                    setAuthMode('register');
                }}
            />
        );
    }

    return (
        <TelnyxProvider>
            <ReleaseGuard />
            <PortalSupportHUD />
            {user && roleContext.tenant_id && !sessionStorage.getItem('portal_mode_config') && (
                <MirrorEmitter tenantId={roleContext.tenant_id} userId={user.id} />
            )}
            <PortalTransition active={false} />
            <SessionTracker />
            <SubscriptionGate>
                <div className="flex min-h-screen bg-slate-50 relative">
                    {/* Mobile Menu Overlay */}
                    {isMobileMenuOpen && (
                        <div
                            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                            onClick={() => setIsMobileMenuOpen(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <Sidebar
                        isMobileOpen={isMobileMenuOpen}
                        activeTab={activeTab}
                        onTabChange={(tab) => {
                            setActiveTab(tab);
                            setIsMobileMenuOpen(false);
                        }}
                        onClose={() => setIsMobileMenuOpen(false)}
                        isCollapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />

                    {/* Main Content */}
                    <div className="flex-1 transition-all duration-300 ease-in-out">
                        {/* Header */}
                        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 backdrop-blur-md lg:px-8">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                                >
                                    <Menu size={20} />
                                </button>
                                <div
                                    className="relative hidden md:block cursor-text"
                                    onClick={() => setIsCommandMenuOpen(true)}
                                >
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <div className="flex items-center h-10 w-64 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm text-slate-400">
                                        Buscar... (Cmd+K)
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 relative">
                                <button
                                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                    className={`relative rounded-full p-2 transition-all duration-300 ${isNotificationOpen ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                                        }`}
                                >
                                    <Bell size={20} />
                                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                                </button>

                                {/* Notification Dropdown */}
                                <AnimatePresence>
                                    {isNotificationOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setIsNotificationOpen(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 top-12 z-50 w-80 md:w-96 max-h-[80vh] overflow-y-auto bg-white border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] p-6"
                                            >
                                                <NotificationInbox />
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>

                                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-medium text-slate-900">{permissionContext.roleName || user.email?.split('@')[0]}</p>
                                        <p className="text-xs text-slate-500 capitalize">{roleContext.customRoleName || role?.replace('_', ' ') || 'Guest'}</p>
                                    </div>
                                    <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
                                        <img
                                            src={`https://ui-avatars.com/api/?name=${user.email}&background=random`}
                                            alt="Avatar"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>
                        </header>

                        <main className="p-4 lg:p-8">
                            <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {renderDashboardContent()}
                            </div>
                        </main>
                    </div>
                </div>
            </SubscriptionGate>
            <SessionGuard />
            <DialerWidget />
            <CommandMenu
                open={isCommandMenuOpen}
                onOpenChange={setIsCommandMenuOpen}
                onNavigate={(tab) => {
                    setActiveTab(tab);
                    setIsCommandMenuOpen(false);
                }}
            />
            <Toaster position="top-right" richColors />
        </TelnyxProvider>
    );
};

export const TenantApp = () => {
    return (
        <RoleProvider>
            <TenantAppInner />
        </RoleProvider>
    );
}
