import { useCallback } from 'react';
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
    const loadSessionForRoute = useCallback(async (route: RouteContext): Promise<boolean> => {
        const client = getClientForRoute(route);
        let storageKey = STORAGE_KEYS[route];

        // Portal Mode: If we are portaling, we should use the platform session
        // regardless of the current route, as the admin is authenticated in the platform.
        const portalConfig = sessionStorage.getItem('portal_mode_config');
        if (portalConfig && route === 'tenant') {
            console.log('[SessionManager] 🛡️ Portal Mode detected, using platform session storage');
            storageKey = STORAGE_KEYS.platform;
        }

        try {
            // Step 1: Clear any existing Supabase session (local only, don't hit server)
            await client.auth.signOut({ scope: 'local' });

            // Step 2: Try to load session from custom storage
            const storedSessionRaw = localStorage.getItem(storageKey);

            if (!storedSessionRaw) {
                console.log(`[SessionManager] No stored session for ${route}`);
                return false;
            }

            const storedSession: Session = JSON.parse(storedSessionRaw);

            // Step 3: Validate session has required fields
            if (!storedSession.access_token || !storedSession.user) {
                console.warn(`[SessionManager] Invalid session data for ${route}, clearing...`);
                localStorage.removeItem(storageKey);
                return false;
            }

            // Step 4: Restore session in Supabase
            const { error } = await client.auth.setSession({
                access_token: storedSession.access_token,
                refresh_token: storedSession.refresh_token,
            });

            if (error) {
                console.error(`[SessionManager] Failed to restore session for ${route}:`, error);
                localStorage.removeItem(storageKey);
                return false;
            }

            console.log(`[SessionManager] ✅ Session loaded for ${route}:`, storedSession.user.email);
            return true;
        } catch (err) {
            console.error(`[SessionManager] Error loading session for ${route}:`, err);
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

    return {
        loadSessionForRoute,
        saveSessionForRoute,
        clearAllSessions,
        migrateExistingSessions,
    };
}
