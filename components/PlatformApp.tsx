import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { TelnyxProvider } from '../contexts/telnyx-context.tsx';
import { createPlatformClient } from '../lib/supabase/platform-client';
import { usePlatformSessionGuard } from '../hooks/use-platform-session-guard';
import { PlatformLogin } from './platform/PlatformLogin';
import { SuperAdminLayout } from './platform/SuperAdminLayout';
import { PlatformDashboard } from './platform/dashboard/PlatformDashboard';
import { TenantManager } from './platform/tenants/TenantManager';
import { FinancialCommand } from './platform/finance/FinancialCommand';
import { SystemTools } from './platform/system/SystemTools';
import { AuditLogViewer } from './platform/audit/AuditLogViewer';
import { SupportInbox } from './platform/support/SupportInbox';
import { BroadcastCenter } from './platform/broadcast/BroadcastCenter';
import { TelephonyManager } from './platform/telephony/TelephonyManager';
import { PlatformCallback } from './platform/finance/PlatformCallback';
import { Loader2 } from 'lucide-react';

export const PlatformApp: React.FC = () => {
    const [platformModule, setPlatformModule] = useState<'dashboard' | 'tenants' | 'finance' | 'system' | 'logs' | 'support' | 'broadcast' | 'telephony'>('dashboard');
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createPlatformClient(); // ISOLATED CLIENT

    // Platform session guard: enforce single session per user
    usePlatformSessionGuard(user?.id);

    const checkSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Verify role
                const { data: roleData } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', session.user.id)
                    .single();

                if (roleData && (roleData as any).role === 'super_admin') {
                    setUser(session.user);
                } else {
                    // Invalid role for platform
                    await supabase.auth.signOut();
                    setUser(null);
                }
            }
        } catch (err) {
            console.error("Platform Session Check Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Nuke any Service Workers to ensure Admin Platform is always fresh/uncached
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let registration of registrations) {
                    console.log('Unregistering SW for Admin Platform:', registration.scope);
                    registration.unregister();
                }
            });
        }

        checkSession();

        // Listen for auth changes on the platform client
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUser(session.user);
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const isCallbackPage = window.location.pathname === '/platform/callback' || window.location.pathname === '/callback'; // Should we check /admin/platform/callback?
    // App.tsx logic was: window.location.pathname === '/platform/callback' || window.location.pathname === '/callback';
    // Let's assume callback might be global or specific. If it's stripe connect callback, it might be /platform/callback.

    if (isCallbackPage) {
        return (
            <>
                <PlatformCallback />
                <Toaster position="top-right" richColors />
            </>
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-900">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
            </div>
        );
    }

    if (!user) {
        return <PlatformLogin onSuccess={() => {
            checkSession();
        }} />;
    }

    return (
        <TelnyxProvider supabaseClient={supabase}>
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
        </TelnyxProvider>
    );
};
