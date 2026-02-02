import { useCallback, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { createPlatformClient } from '../lib/supabase/platform-client';
import { createCleanerClient } from '../lib/supabase/cleaner-client';
import type { Session } from '@supabase/supabase-js';

type RouteContext = 'platform' | 'tenant' | 'cleaner';

const STORAGE_KEYS = {
    platform: 'manual-session-platform',
    tenant: 'manual-session-tenant',
    cleaner: 'manual-session-cleaner',
} as const;

// Legacy keys for migration
const LEGACY_KEYS = [
    'sb-tenant-auth-token',
    'sb-platform-auth-token',
    'sb-cleaner-auth-token',
];

/**
 * Custom Session Manager for route-based session isolation.
 * Allows Platform, Tenant, and Cleaner apps to have independent sessions.
 */
export function useSessionManager() {
    const tenantClient = createClient();
    const platformClient = createPlatformClient();
    const cleanerClient = createCleanerClient();

    /**
     * Get the appropriate Supabase client for a route context
     */
    const getClientForRoute = useCallback((route: RouteContext) => {
        switch (route) {
            case 'platform':
                return platformClient;
            case 'cleaner':
                return cleanerClient;
            case 'tenant':
            default:
                return tenantClient;
        }
    }, [platformClient, cleanerClient, tenantClient]);

    /**
     * Load session for a specific route context
     */
    /**
     * Load session for a specific route context
     */
    const loadSessionForRoute = useCallback(async (route: RouteContext): Promise<boolean> => {
        const client = getClientForRoute(route);

        try {
            // Simply check if we have a valid session
            const { data: { session }, error } = await client.auth.getSession();

            if (error || !session) {
                console.log(`[SessionManager] No active session for ${route}`);
                return false;
            }

            console.log(`[SessionManager] ✅ Session valid for ${route}:`, session.user.email);
            return true;
        } catch (err) {
            console.error(`[SessionManager] Error checking session for ${route}:`, err);
            return false;
        }
    }, [getClientForRoute]);

    /**
     * Save session for a specific route context
     */
    const saveSessionForRoute = useCallback((route: RouteContext, session: Session) => {
        const storageKey = STORAGE_KEYS[route];

        try {
            localStorage.setItem(storageKey, JSON.stringify(session));
            console.log(`[SessionManager] ✅ Session saved for ${route}:`, session.user.email);
        } catch (err) {
            console.error(`[SessionManager] Failed to save session for ${route}:`, err);
        }
    }, []);

    /**
     * Clear all custom sessions (Nuclear Reset)
     */
    const clearAllSessions = useCallback(async () => {
        try {
            // Clear custom storage
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });

            // Clear legacy keys
            LEGACY_KEYS.forEach(key => {
                localStorage.removeItem(key);
            });

            // Sign out from all clients
            await Promise.all([
                tenantClient.auth.signOut({ scope: 'local' }),
                platformClient.auth.signOut({ scope: 'local' }),
                cleanerClient.auth.signOut({ scope: 'local' }),
            ]);

            console.log('[SessionManager] 🔥 All sessions cleared (Nuclear Reset)');
        } catch (err) {
            console.error('[SessionManager] Error during Nuclear Reset:', err);
        }
    }, [tenantClient, platformClient, cleanerClient]);

    /**
     * Migrate existing sessions to new storage keys (one-time operation)
     */
    const migrateExistingSessions = useCallback(() => {
        let migrated = false;

        // Check if migration already happened
        const migrationFlag = localStorage.getItem('session-migration-completed');
        if (migrationFlag) {
            return;
        }

        // Attempt to migrate from legacy keys
        LEGACY_KEYS.forEach((legacyKey, index) => {
            const legacyData = localStorage.getItem(legacyKey);
            if (legacyData) {
                try {
                    const session = JSON.parse(legacyData);
                    const route: RouteContext = index === 0 ? 'tenant' : index === 1 ? 'platform' : 'cleaner';
                    saveSessionForRoute(route, session);
                    migrated = true;
                    console.log(`[SessionManager] Migrated session from ${legacyKey} to ${STORAGE_KEYS[route]}`);
                } catch (err) {
                    console.warn(`[SessionManager] Failed to migrate ${legacyKey}:`, err);
                }
            }
        });

        // Mark migration as complete
        localStorage.setItem('session-migration-completed', 'true');

        if (migrated) {
            console.log('[SessionManager] ✅ Session migration completed');
        }
    }, [saveSessionForRoute]);

    /**
     * Automatic Session Sync: Listen to all clients and update manual storage
     * This ensures manual-session-* keys are never stale when Supabase auto-refreshes tokens.
     */
    useEffect(() => {
        const clients = [
            { client: tenantClient, route: 'tenant' as RouteContext },
            { client: platformClient, route: 'platform' as RouteContext },
            { client: cleanerClient, route: 'cleaner' as RouteContext }
        ];

        const subs = clients.map(({ client, route }) => {
            return client.auth.onAuthStateChange((event, session) => {
                if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
                    saveSessionForRoute(route, session);
                }
            }).data.subscription;
        });

        return () => {
            subs.forEach(sub => sub.unsubscribe());
        };
    }, [tenantClient, platformClient, cleanerClient, saveSessionForRoute]);

    return {
        loadSessionForRoute,
        saveSessionForRoute,
        clearAllSessions,
        migrateExistingSessions,
    };
}
