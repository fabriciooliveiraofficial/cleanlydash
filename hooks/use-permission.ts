import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRole } from './use-role';

export const PERMISSIONS = {
    // Financial
    FINANCE_VIEW_BALANCE: 'finance.view_balance',
    FINANCE_MANAGE_FUNDS: 'finance.manage_funds',

    // Payroll
    PAYROLL_VIEW: 'payroll.view',
    PAYROLL_MANAGE: 'payroll.manage',

    // Team
    TEAM_VIEW: 'team.view',
    TEAM_MANAGE: 'team.manage',

    // Customers
    CUSTOMERS_VIEW: 'customers.view',
    CUSTOMERS_MANAGE: 'customers.manage',

    // Operations
    TASKS_VIEW: 'tasks.view',
    TASKS_MANAGE_ALL: 'tasks.manage_all',

    // Settings
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_MANAGE: 'settings.manage',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

interface PermissionContext {
    permissions: PermissionKey[];
    loading: boolean;
    can: (permission: PermissionKey) => boolean;
    roleName: string | null;
}

export function usePermission(): PermissionContext {
    const [permissions, setPermissions] = useState<PermissionKey[]>([]);
    const [roleName, setRoleName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const { role: globalRole, isOwner, user } = useRole(); // Get user from useRole

    useEffect(() => {
        let mounted = true;

        async function fetchPermissions() {
            try {
                // Optimize: Use user from useRole if available, otherwise fetch
                let targetUser = user;

                if (!targetUser) {
                    const { data } = await supabase.auth.getUser();
                    targetUser = data.user;
                }

                if (!targetUser) {
                    // Start loading only if useRole is not yet loaded? 
                    // Actually if user is null from useRole, useRole might be loading OR user is logged out.
                    // But if we are here, we might need to wait for useRole?
                    // Simplified: just try to get user.
                    if (mounted) setLoading(false);
                    return;
                }

                // If owner, grant all permissions
                if (isOwner) {
                    if (mounted) {
                        setPermissions(Object.values(PERMISSIONS));
                        setRoleName('Owner');
                        setLoading(false);
                    }
                    return;
                }

                // Fetch Role ID from team_members
                // Note: assuming single tenant context or active tenant logic
                const { data: member, error: memberError } = await supabase
                    .from('team_members')
                    .select(`
                        role_id,
                        custom_roles (
                            name,
                            permissions
                        )
                    `)
                    .eq('user_id', targetUser.id)
                    .maybeSingle();

                if (memberError) throw memberError;

                // Explicitly cast to any to avoid TS errors with join inference
                const memberData = member as any;

                if (memberData?.custom_roles) {
                    const customRole = memberData.custom_roles;
                    if (mounted) {
                        setPermissions(customRole.permissions || []);
                        setRoleName(customRole.name);
                    }
                } else {
                    // Fallback to legacy role mapping if no custom role assigned yet
                    // This creates a smooth transition
                    const legacyDefaults: Record<string, PermissionKey[]> = {
                        'admin': Object.values(PERMISSIONS), // Legacy admin
                        'super_admin': Object.values(PERMISSIONS), // Fix for Super Admin
                        'property_owner': Object.values(PERMISSIONS), // Fix for Owner
                        'manager': [PERMISSIONS.TEAM_MANAGE, PERMISSIONS.TASKS_MANAGE_ALL, PERMISSIONS.CUSTOMERS_MANAGE],
                        'cleaner': [PERMISSIONS.TASKS_VIEW],
                        'staff': [PERMISSIONS.TEAM_VIEW, PERMISSIONS.TASKS_VIEW]
                    };

                    if (globalRole && legacyDefaults[globalRole]) {
                        if (mounted) {
                            setPermissions(legacyDefaults[globalRole]);
                            setRoleName(globalRole); // "admin", "cleaner" etc
                        }
                    }
                }

            } catch (err) {
                console.error("Permission Fetch Error", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchPermissions();

        return () => { mounted = false; };
    }, [isOwner, globalRole]);

    const can = (permission: PermissionKey) => {
        if (loading) return false;
        if (isOwner) return true; // Owner super-override
        return permissions.includes(permission);
    };

    return { permissions, loading, can, roleName };
}
