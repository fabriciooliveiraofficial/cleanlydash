
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import { Header } from './components/Header.tsx';
import { Overview } from './components/Overview.tsx';
import { Bookings } from './components/Bookings.tsx';
import { Customers } from './components/Customers.tsx';
import { Team } from './components/Team.tsx';
import { PayrollDashboard } from './components/team/PayrollDashboard.tsx';
import { Settings } from './components/Settings.tsx';
import { MapView } from './components/MapView.tsx';
import { Wallet } from './components/Wallet.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { FeaturesPage } from './components/FeaturesPage.tsx';
import { SystemDiagnostics } from './components/SystemDiagnostics';
import { AuthFlow } from './components/AuthFlow.tsx';
import { DialerWidget } from './components/telephony/dialer-widget.tsx';
import { UnifiedInbox } from './components/telephony/UnifiedInbox.tsx';
import { Resources } from './components/Resources.tsx';
import AirbnbDispatch from './components/AirbnbDispatch.tsx';
import { TelnyxProvider } from './contexts/telnyx-context.tsx';
import { TabType } from './types.ts';
import { createClient } from './lib/supabase/client.ts';
import { User } from '@supabase/supabase-js';
import { toast, Toaster } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Plane, Users, Wallet as WalletIcon, DollarSign, PhoneCall, LifeBuoy, Package, Sparkles, Map, Menu, Search, Bell } from 'lucide-react';
import { SessionTracker } from './components/system/SessionTracker';
import { CleanerApp } from './components/cleaner/CleanerApp.tsx';
import { useRole } from './hooks/use-role.ts';
import { usePermission } from './hooks/use-permission.ts';
import { useSessionManager } from './hooks/use-session-manager.ts';
import { AcceptInvite } from './components/AcceptInvite.tsx';
import { TenantOnboarding } from './components/TenantOnboarding.tsx';
import { PlatformLogin } from './components/platform/PlatformLogin.tsx';
import { SuperAdminLayout } from './components/platform/SuperAdminLayout.tsx';
import { PlatformDashboard } from './components/platform/dashboard/PlatformDashboard.tsx';
import { TenantManager } from './components/platform/tenants/TenantManager.tsx';
import { FinancialCommand } from './components/platform/finance/FinancialCommand.tsx';
import { SystemTools } from './components/platform/system/SystemTools.tsx';
import { AuditLogViewer } from './components/platform/audit/AuditLogViewer.tsx';
import { SupportInbox } from './components/platform/support/SupportInbox.tsx';
import { BroadcastCenter } from './components/platform/broadcast/BroadcastCenter.tsx';
import { TelephonyManager } from './components/platform/telephony/TelephonyManager.tsx';
import { PlatformCallback } from './components/platform/finance/PlatformCallback.tsx';
import { PaymentLinkManager } from './components/commerce/PaymentLinkManager.tsx';
import { PaymentSuccessPage } from './components/commerce/PaymentSuccessPage.tsx';
import { TenantSupport } from './components/support/TenantSupport.tsx';
import { SubscriptionGate } from './components/subscription/SubscriptionGate'; // Import Gateway
import { SessionGuard } from './components/system/SessionGuard.tsx';




const App: React.FC = () => {
  useSessionManager(); // Active Session Enforcement
  const [activeTab, setActiveTab] = useState<TabType>(TabType.OVERVIEW);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'landing' | 'auth' | 'dashboard' | 'features'>('landing');
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(undefined);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify'>('register'); // Default to register for Landing Page CTAs
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const roleContext = useRole(); // Fetch role context
  const { role } = roleContext;
  const [platformModule, setPlatformModule] = useState<'dashboard' | 'tenants' | 'finance' | 'system' | 'logs' | 'support' | 'broadcast' | 'telephony'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);


  useEffect(() => {
    let sessionTimeout: NodeJS.Timeout;

    // Safety timeout - if session check takes too long, something is stuck
    // Safety timeout - if session check takes too long, something is stuck
    sessionTimeout = setTimeout(() => {
      console.warn('Session check timeout - check network or supabase status');
      // Do NOT clear storage - just stop loading to show UI (maybe offline mode)
      setLoading(false);
      // Optional: setView('landing') if you really want, but better to stay and let user retry
    }, 15000); // 15 second timeout

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        clearTimeout(sessionTimeout);

        if (error) {
          console.error('Session error:', error);
          // Only sign out if it's a real Auth error, not just network
          // But strict security preference: if error, safe to sign out.
          supabase.auth.signOut().catch(() => { });
          setUser(null);
          setView('landing');
        } else {
          setUser(session?.user ?? null);
          if (session?.user) setView('dashboard');
        }
        setLoading(false);
      })
      .catch((err: any) => {
        clearTimeout(sessionTimeout);

        // Ignore AbortError - it happens on navigation/unmount and is NOT a fatal session error
        if (err?.name === 'AbortError') {
          console.warn('Session fetch aborted (non-fatal)');
          return; // Do NOT clear user/session
        }

        console.error('Session fetch failed:', err);
        setLoading(false);
        // Do not force logout on fetch fail - might be offline
      });

    // Simple Routing Logic
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode');

    if (path === '/auth') {
      setView('auth');
      if (modeParam === 'login' || modeParam === 'register' || modeParam === 'verify') {
        setAuthMode(modeParam);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        setView('dashboard');
      } else if (event === 'SIGNED_OUT') {
        // Only force landing if explicitly signed out
        setView('landing');
      }
      // If just checking session and no user found, DO NOT force landing.
      // This allows 'auth' view to persist when clicked.

      setLoading(false);
    });

    // Auto-Register Service Worker for Notifications
    if ('serviceWorker' in navigator && user && (role === 'cleaner' || role === 'staff')) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Push SW Registered:', reg.scope))
        .catch(err => console.error('Push SW Registration failed:', err));
    }

    return () => {
      clearTimeout(sessionTimeout);
      subscription.unsubscribe();
    };
  }, [user, role]); // Run when user or role changes

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
      case TabType.SUPPORT: return <TenantSupport />;
      case TabType.RESOURCES: return <Resources />;
      case TabType.AIRBNB_CENTER: return <AirbnbDispatch />;
      default: return <Overview />;
    }
  };

  // =====================================================
  //  PRIORITY 0: Invite Acceptance (HIGHEST PRIORITY)
  //  This MUST run before ANY loading or session checks!
  //  Handles both legacy ?token= and new Supabase ?invited=true
  // =====================================================
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const inviteToken = params.get('token');
  const isInvited = params.get('invited') === 'true';

  // Check for Tenant Onboarding Route: /:slug or /:slug/join
  const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(p => p !== '') : [];
  // Reserved routes that are NOT tenants
  const reservedRoutes = ['auth', 'dashboard', 'settings', 'team', 'bookings', 'debug'];

  const isTenantJoinRoute = pathParts.length === 2 && pathParts[1] === 'join';
  const isTenantRootRoute = pathParts.length === 1 && !reservedRoutes.includes(pathParts[0]);

  if (isTenantJoinRoute || isTenantRootRoute) {
    // ...
    return <TenantOnboarding onLoginRequest={() => { window.location.href = '/auth' }} />;
  }

  // Guest Payment Success Route
  if (window.location.pathname === '/payment-success') {
    return <PaymentSuccessPage />;
  }

  // System Diagnostics (Debugging Tool)
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

  // =====================================================
  //  Loading State (Wait for session AND role data AND permissions)
  //  Permission loading is crucial to avoid sidebar flickering
  // =====================================================
  // Priority 1: Platform Operations Center (Super Admin) & Stripe Callback
  const isPlatformRoute = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/admin/platform') ||
    window.location.pathname.startsWith('/platform') ||
    window.location.pathname.startsWith('/callback')
  );

  if (isPlatformRoute) {
    const isCallbackPage = window.location.pathname === '/platform/callback' || window.location.pathname === '/callback';
    if (isCallbackPage) {
      return (
        <>
          <PlatformCallback />
          <Toaster position="top-right" richColors />
        </>
      );
    }

    // If not logged in or not super admin, show platform login
    const isLoginPage = window.location.pathname === '/platform/login';

    if (isLoginPage) {
      return <PlatformLogin onSuccess={() => window.location.href = '/admin/platform'} />;
    }

    // Checking "God Mode" Access
    if (loading) return null; // Wait for session only for protected platform tools

    if (!user || role !== 'super_admin') {
      // If we are not authenticated as super admin, force login
      return <PlatformLogin onSuccess={() => window.location.reload()} />;
    }

    // Render Layout + Content
    return (
      <SuperAdminLayout
        activeModule={platformModule}
        onNavigate={setPlatformModule}
      >
        {platformModule === 'dashboard' && <PlatformDashboard />}
        {platformModule === 'tenants' && <TenantManager />}
        {platformModule === 'finance' && <FinancialCommand />}
        {platformModule === 'system' && <SystemTools />}
        {platformModule === 'logs' && <AuditLogViewer />}
        {platformModule === 'support' && <SupportInbox />}
        {platformModule === 'broadcast' && <BroadcastCenter />}
        {platformModule === 'telephony' && <TelephonyManager />}
        <Toaster position="top-right" richColors />
      </SuperAdminLayout>
    );
  }

  // Priority 2: Loading State (Wait for session AND role data AND permissions)
  if (loading || (user && (roleContext.loading || permissionContext.loading))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-500">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
            <Plane className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" size={24} />
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Cleanlydash</h2>
            <p className="text-sm font-medium text-slate-400">Preparando sua experiência premium...</p>
          </div>
        </div>
      </div>
    );
  }

  // Priority 3: Auth Flow (if explicitly requested)
  if (view === 'auth' && !user) {
    return (
      <AuthFlow
        onBack={() => setView('landing')}
        onAuthenticated={() => setView('dashboard')}
        selectedPlan={selectedPlan}
        initialMode={authMode} // Pass authMode to AuthFlow
      />
    );
  }

  // Priority 4: Landing (Normal User)
  if (view === 'landing') {
    return (
      <LandingPage
        onStart={(planId) => {
          setSelectedPlan(planId);
          setAuthMode('register'); // Force Register Mode
          setView('auth');
        }}
        onLogin={() => {
          setSelectedPlan(undefined);
          setAuthMode('login'); // Force Login Mode
          setView('auth');
        }}
        onFeatures={() => setView('features')}
      />
    );
  }

  // Priority 5: Features Page
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

  // Cleaner Application View (Mobile PWA)
  // Higher priority than dashboard - if app_access is cleaner_app, show this
  if (roleContext.app_access === 'cleaner_app' || window.location.hash === '#cleaner') {
    return (
      <>
        <CleanerApp
          userName={roleContext.name || 'Cleaner'}
          userId={user?.id}
        />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  // Dashboard View
  // We only gate if it is NOT the admin platform (Admin has different rules, or apply same gate?)
  // Actually, Platform Ops (Super Admin) should NOT be gated by subscription (unless we charge admins?)
  // The requirement is for Tenant Dashboard.

  // For Tenants:
  return (
    <TelnyxProvider>
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
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar... (Cmd+K)"
                    className="h-10 w-64 rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors">
                  <Bell size={20} />
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                </button>

                <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-900">{permissionContext.roleName || user.email?.split('@')[0]}</p>
                    <p className="text-xs text-slate-500 capitalize">{roleContext.customRoleName || role?.replace('_', ' ') || 'Guest'}</p>
                  </div>
                  <div className="h-9 w-9 overflow-hidden rounded-full ring-2 ring-white shadow-sm">
                    {/* Avatar */}
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
      {/* Softphone flutuante persistente com IA Live Coach */}
      <DialerWidget />
      <Toaster position="top-right" richColors />
    </TelnyxProvider>
  );
};

export default App;
