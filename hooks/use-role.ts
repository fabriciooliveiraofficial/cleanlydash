import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';

export type AppRole = 'super_admin' | 'property_owner' | 'staff' | 'guest' | 'cleaner';

export interface UserRoleContext {
    user: any | null; // Added user
    name: string | null;
    role: AppRole | null;
    loading: boolean;
    // Helpers
    isAdmin: boolean;
    isOwner: boolean;
    isStaff: boolean;
    isGuest: boolean;
    isCleaner: boolean;
    app_access: 'dashboard' | 'cleaner_app' | null;
    // Permissions
    canAccessFinance: boolean;
    canAccessSettings: boolean;
    canViewAllProperties: boolean;
    tenant_id: string | null;
    customRoleName: string | null; // Added customRoleName
}

export function useRole(): UserRoleContext {
    const [user, setUser] = useState<any | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);
    const [appAccess, setAppAccess] = useState<'dashboard' | 'cleaner_app' | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [customRoleName, setCustomRoleName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        let mounted = true;
        let retryCount = 0;
        const MAX_RETRIES = 2;

        async function fetchRole() {
            // Prevent infinite retry loops
            if (retryCount >= MAX_RETRIES) {
                console.warn('useRole: Max retries reached, setting guest fallback');
                if (mounted) {
                    setRole('guest');
                    setLoading(false);
                }
                return;
            }
            retryCount++;

            try {
                setLoading(true);
                // Try getUser first (secure)
                let { data: { user: authUser } } = await supabase.auth.getUser();

                // Fallback to session (resilient)
                if (!authUser) {
                    const { data: { session } } = await supabase.auth.getSession();
                    authUser = session?.user ?? null;
                }

                if (mounted) {
                    setUser(authUser);
                }

                if (!authUser) {
                    if (mounted) {
                        setRole(null);
                        setLoading(false);
                    }
                    return;
                }

                // 1. Check Team Members (Tenant Context) with Role Join
                const { data: teamMember } = await supabase
                    .from('team_members')
                    .select('name, role, role_id, tenant_id, custom_roles(name, app_access)')
                    .eq('user_id', authUser.id)
                    .eq('status', 'active')
                    .maybeSingle();

                if (teamMember) {
                    const dbRole = (teamMember as any).role as AppRole;
                    const dbName = (teamMember as any).name;
                    const customRoleName = (teamMember as any).custom_roles?.name;
                    const dbAppAccess = (teamMember as any).custom_roles?.app_access || (dbRole === 'cleaner' ? 'cleaner_app' : 'dashboard');
                    const dbTenantId = (teamMember as any).tenant_id;

                    if (mounted) {
                        // Deriving AppRole from app_access to maintain compatibility with high-level logic
                        setRole(dbAppAccess === 'cleaner_app' ? 'cleaner' : 'staff');
                        setAppAccess(dbAppAccess as any);
                        setName(dbName);
                        setTenantId(dbTenantId);
                        setCustomRoleName(customRoleName);
                    }
                } else {
                    // 2. Check Tenant Profiles (Owner Context)
                    const { data: tenantProfile } = await supabase
                        .from('tenant_profiles')
                        .select('name, id')
                        .eq('id', authUser.id)
                        .maybeSingle();

                    if (tenantProfile) {
                        if (mounted) {
                            setRole('super_admin'); // Or determine from user_roles if needed
                            setAppAccess('dashboard');
                            setName((tenantProfile as any).name);
                            setTenantId(authUser.id);
                            setCustomRoleName('Owner');
                        }
                    } else {
                        // 3. Fallback to User Roles
                        const { data: userRole, error: userError } = await supabase
                            .from('user_roles')
                            .select('role')
                            .eq('user_id', authUser.id)
                            .maybeSingle();

                        if (mounted) {
                            if (userError || !userRole) {
                                setRole('guest');
                                setAppAccess('dashboard');
                                setTenantId(null);
                            } else {
                                const dbRole = (userRole as any).role as AppRole;
                                setRole(dbRole);
                                setAppAccess(dbRole === 'cleaner' ? 'cleaner_app' : 'dashboard');
                                // Only set tenantId to authUser.id if they are expected to be an owner/tenant
                                if (dbRole === 'super_admin' || dbRole === 'property_owner') {
                                    setTenantId(authUser.id);
                                } else {
                                    setTenantId(null);
                                }
                            }
                        }
                    }
                }
            } catch (err: any) {
                // ... same error handling ...
                if (mounted) {
                    setRole('guest');
                    setAppAccess('dashboard');
                }
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchRole();

        // Subscribe to Auth Changes to fix Stale State
        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                fetchRole();
            }
        });

        return () => {
            mounted = false;
            authListener.subscription.unsubscribe();
        };
    }, []);

    const isAdmin = role === 'super_admin';
    const isOwner = role === 'property_owner';
    const isStaff = role === 'staff';
    const isGuest = role === 'guest';
    const isCleaner = role === 'cleaner';

    return {
        user,
        name,
        role,
        loading,
        isAdmin,
        isOwner,
        isStaff,
        isGuest,
        isCleaner,
        app_access: appAccess,
        // Permission Logic Matrix
        canAccessFinance: isAdmin || isOwner, // Owners see their own finance
        canAccessSettings: isAdmin,
        canViewAllProperties: isAdmin, // Owners only see theirs (handled by RLS)
        tenant_id: tenantId,
        customRoleName: customRoleName
    };
}
