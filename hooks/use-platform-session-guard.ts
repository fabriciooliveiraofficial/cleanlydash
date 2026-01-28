import { useEffect, useRef } from 'react';
import { createPlatformClient } from '../lib/supabase/platform-client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

/**
 * Platform Session Guard
 * Enforces single-session-per-user for Platform Ops Center.
 * If user logs in on another device/tab, this session is automatically terminated.
 */
export function usePlatformSessionGuard(userId: string | undefined) {
    const platformClient = createPlatformClient();
    const sessionIdRef = useRef<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!userId) {
            return;
        }

        const registerSession = async () => {
            // Generate unique session ID for this tab/device
            const sessionId = uuidv4();
            sessionIdRef.current = sessionId;

            try {
                // Register this session as the active one
                const { error } = await platformClient
                    .from('active_sessions')
                    .upsert({
                        user_id: userId,
                        session_id: sessionId,
                        context: 'platform',
                        last_seen: new Date().toISOString(),
                    }, {
                        onConflict: 'user_id,context'
                    });

                if (error) {
                    console.error('[PlatformSessionGuard] Failed to register session:', error);
                    return;
                }

                console.log(`[PlatformSessionGuard] ✅ Session registered: ${sessionId.slice(0, 8)}...`);
            } catch (err) {
                console.error('[PlatformSessionGuard] Error registering session:', err);
            }
        };

        const checkSessionValidity = async () => {
            if (!sessionIdRef.current) {
                return;
            }

            try {
                const { data, error } = await platformClient
                    .from('active_sessions')
                    .select('session_id')
                    .eq('user_id', userId)
                    .eq('context', 'platform')
                    .single();

                if (error) {
                    console.warn('[PlatformSessionGuard] Failed to check session:', error);
                    return;
                }

                // If the session_id in the database doesn't match ours, we've been replaced
                if (data && data.session_id !== sessionIdRef.current) {
                    console.warn('[PlatformSessionGuard] ⚠️ Session replaced by another login. Logging out...');

                    // Clear interval first to prevent multiple logout attempts
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }

                    // Show toast notification
                    toast.error('Você foi desconectado porque fez login em outro dispositivo', {
                        duration: 5000,
                    });

                    // Sign out locally
                    await platformClient.auth.signOut({ scope: 'local' });

                    // Clear Platform session from custom storage
                    localStorage.removeItem('manual-session-platform');

                    // Redirect to Platform login
                    window.location.href = '/platform/login';
                }
            } catch (err) {
                console.error('[PlatformSessionGuard] Error checking session validity:', err);
            }
        };

        // Register session on mount
        registerSession();

        // Check session validity every 10 seconds
        intervalRef.current = setInterval(checkSessionValidity, 10000);

        // Cleanup on unmount
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [userId, platformClient]);
}
