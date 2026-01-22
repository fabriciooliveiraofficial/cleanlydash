import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { createClient } from '../lib/supabase/client';
import { AppRole, UserRoleContext } from '../types';

const RoleContext = createContext<UserRoleContext | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<any | null>(null);
    const [name, setName] = useState<string | null>(null);
    const [role, setRole] = useState<AppRole | null>(null);
    const [appAccess, setAppAccess] = useState<'dashboard' | 'cleaner_app' | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [customRoleName, setCustomRoleName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const isFetching = useRef(false);

    useEffect(() => {
        let mounted = true;
        const initialLoadComplete = { current: false };

        // Safety timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
            if (mounted && loading && !initialLoadComplete.current) {
                console.warn('RoleProvider: Safety timeout triggered - forcing loading completion');
                setLoading(false);
                if (!role) setRole('guest');
                initialLoadComplete.current = true;
            }
        }, 8000); // 8 seconds max wait

        async function fetchRole(authUser: any | null, isInitialLoad: boolean = false) {
            // Only block concurrent fetches, but don't queue them
            if (isFetching.current) {
                return;
            }

            try {
                isFetching.current = true;

                // Only set loading true on initial load if we haven't loaded yet
                if (isInitialLoad && mounted && !initialLoadComplete.current) {
                    setLoading(true);
                }

                if (mounted) {
                    setUser(authUser);
                }

                if (!authUser) {
                    console.log('RoleProvider: No active session');
                    if (mounted) {
                        setRole('guest');
                        setLoading(false);
                        initialLoadComplete.current = true;
                    }
                    return;
                }

                console.log('RoleProvider: Fetching role for', authUser.email);

                // Helper for timeout-wrapped queries
                function timeoutPromise<T>(promise: PromiseLike<T>, ms: number = 5000): Promise<T> {
                    return Promise.race([
                        promise,
                        new Promise<never>((_, reject) =>
                            setTimeout(() => reject(new Error('Query timeout')), ms)
                        )
                    ]);
                }

                // Parallel fetching of potential roles for speed
                const [teamMemberResult, tenantProfileResult, userRoleResult] = await Promise.allSettled([
                    timeoutPromise(supabase
                        .from('team_members')
                        .select('name, role, role_id, tenant_id, custom_roles(name, app_access)')
                        .eq('user_id', authUser.id)
                        .eq('status', 'active')
                        .maybeSingle()),

                    timeoutPromise(supabase
                        .from('tenant_profiles')
                        .select('*')
                        .eq('id', authUser.id)
                        .maybeSingle()),

                    timeoutPromise(supabase
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', authUser.id)
                        .maybeSingle())
                ]);

                if (!mounted) return;

                // 1. Check Tenant Owner (Highest Priority)
                if (tenantProfileResult.status === 'fulfilled' && (tenantProfileResult.value as any).data) {
                    const profile = (tenantProfileResult.value as any).data;
                    console.log('RoleProvider: Resolved as Tenant Owner');
                    setRole('super_admin');
                    setAppAccess('dashboard');
                    setName((profile as any).name);
                    setTenantId(authUser.id);
                    setCustomRoleName('Owner');
                    setLoading(false);
                    initialLoadComplete.current = true;
                    return;
                }

                // 2. Check Team Member
                if (teamMemberResult.status === 'fulfilled' && (teamMemberResult.value as any).data) {
                    const member = (teamMemberResult.value as any).data;
                    console.log('RoleProvider: Resolved as Team Member');
                    const dbRole = (member as any).role as AppRole;
                    const dbAppAccess = (member as any).custom_roles?.app_access || (dbRole === 'cleaner' ? 'cleaner_app' : 'dashboard');

                    setRole(dbAppAccess === 'cleaner_app' ? 'cleaner' : 'staff');
                    setAppAccess(dbAppAccess as any);
                    setName((member as any).name);
                    setTenantId((member as any).tenant_id);
                    setCustomRoleName((member as any).custom_roles?.name);
                    setLoading(false);
                    initialLoadComplete.current = true;
                    return;
                }

                // 3. User Roles Fallback
                if (userRoleResult.status === 'fulfilled' && (userRoleResult.value as any).data) {
                    const userRole = (userRoleResult.value as any).data;
                    console.log('RoleProvider: Resolved from User Roles');
                    const dbRole = (userRole as any).role as AppRole;
                    setRole(dbRole);
                    setAppAccess(dbRole === 'cleaner' ? 'cleaner_app' : 'dashboard');
                    if (dbRole === 'super_admin' || dbRole === 'property_owner') {
                        setTenantId(authUser.id);
                    }
                    setLoading(false);
                    initialLoadComplete.current = true;
                    return;
                }

                // 4. Default Guest
                console.log('RoleProvider: No specific role found, defaulting to guest');
                setRole('guest');
                setLoading(false);
                initialLoadComplete.current = true;

            } catch (err: any) {
                console.error('RoleProvider Critical Execution Error:', err);
                if (mounted) {
                    setRole(prev => prev || 'guest');
                    setLoading(false);
                    initialLoadComplete.current = true;
                }
            } finally {
                isFetching.current = false;
            }
        }

        // Use onAuthStateChange to wait for session restoration from localStorage
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('RoleProvider: Auth event:', event);

            if (event === 'INITIAL_SESSION') {
                fetchRole(session?.user ?? null, true);
            } else if (event === 'SIGNED_IN') {
                fetchRole(session?.user ?? null, true);
            } else if (event === 'TOKEN_REFRESHED') {
                if (session?.user && mounted) {
                    setUser(session.user);
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setRole('guest');
                setLoading(false);
                initialLoadComplete.current = true;
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            subscription.unsubscribe();
        };
    }, []);

    const isAdmin = role === 'super_admin';
    const isOwner = role === 'property_owner' || role === 'super_admin';
    const isStaff = role === 'staff';
    const isGuest = role === 'guest' || !role;
    const isCleaner = role === 'cleaner';

    const value = React.useMemo<UserRoleContext>(() => ({
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
        canAccessFinance: isAdmin || isOwner,
        canAccessSettings: isAdmin,
        canViewAllProperties: isAdmin,
        tenant_id: tenantId,
        customRoleName: customRoleName
    }), [user, name, role, loading, isAdmin, isOwner, isStaff, isGuest, isCleaner, appAccess, tenantId, customRoleName]);

    return (
        <RoleContext.Provider value={value}>
            {children}
        </RoleContext.Provider>
    );
}

export { RoleContext };
