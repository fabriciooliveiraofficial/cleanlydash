import { useEffect, useState, useMemo } from 'react';
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
    const { role: globalRole, isOwner, isAdmin, user, loading: roleLoading } = useRole();

    // Consolidated full access flag
    const hasFullAccess = useMemo(() => {
        return !roleLoading && (isOwner || isAdmin || globalRole === 'super_admin' || globalRole === 'property_owner');
    }, [isOwner, isAdmin, globalRole, roleLoading]);

    useEffect(() => {
        let mounted = true;

        async function fetchPermissions() {
            if (roleLoading) return;

            try {
                // Determine target user
                let targetUser = user;
                if (!targetUser) {
                    const { data } = await supabase.auth.getUser();
                    targetUser = data.user;
                }

                // 1. Full Access Override
                if (hasFullAccess) {
                    if (mounted) {
                        setPermissions(Object.values(PERMISSIONS));
                        setRoleName(globalRole || 'Owner');
                        setLoading(false);
                    }
                    return;
                }

                // 2. Guest / Unauthenticated
                if (!targetUser) {
                    if (mounted) {
                        setPermissions([PERMISSIONS.TASKS_VIEW]);
                        setRoleName('guest');
                        setLoading(false);
                    }
                    return;
                }

                // 3. Custom DB Permissions
                let foundCustom = false;
                try {
                    const { data: member } = await supabase
                        .from('team_members')
                        .select('role_id, custom_roles(name, permissions)')
                        .eq('user_id', targetUser.id)
                        .maybeSingle();

                    if ((member as any)?.custom_roles) {
                        const custom = (member as any).custom_roles;
                        if (mounted) {
                            setPermissions(custom.permissions || []);
                            setRoleName(custom.name);
                            foundCustom = true;
                        }
                    }
                } catch (e) {
                    console.warn('usePermission: DB check failed', e);
                }

                // 4. Legacy Fallbacks
                if (!foundCustom && globalRole) {
                    const legacyDefaults: Record<string, PermissionKey[]> = {
                        'admin': Object.values(PERMISSIONS),
                        'super_admin': Object.values(PERMISSIONS),
                        'property_owner': Object.values(PERMISSIONS),
                        'manager': [PERMISSIONS.TEAM_MANAGE, PERMISSIONS.TASKS_MANAGE_ALL, PERMISSIONS.CUSTOMERS_MANAGE],
                        'cleaner': [PERMISSIONS.TASKS_VIEW],
                        'staff': [PERMISSIONS.TEAM_VIEW, PERMISSIONS.TASKS_VIEW, PERMISSIONS.CUSTOMERS_VIEW],
                        'guest': [PERMISSIONS.TASKS_VIEW]
                    };

                    const defaults = legacyDefaults[globalRole];
                    if (defaults && mounted) {
                        setPermissions(defaults);
                        setRoleName(globalRole);
                    }
                }

            } catch (err) {
                console.error("usePermission Error:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchPermissions();
        return () => { mounted = false; };
    }, [hasFullAccess, globalRole, user, roleLoading]);

    const can = (permission: PermissionKey) => {
        // Direct inline check for admins/owners - bypass all state dependencies
        const isFullAccess = isOwner || isAdmin || globalRole === 'super_admin' || globalRole === 'property_owner';

        if (isFullAccess) {
            return true;
        }

        if (roleLoading || loading) {
            return false; // Still loading, deny for now
        }

        return permissions.includes(permission);
    };

    return { permissions, loading: loading || roleLoading, can, roleName };
}
