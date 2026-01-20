import { useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { toast } from 'sonner';

export function useSessionManager() {
    const supabase = createClient();

    useEffect(() => {
        const manageSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Simple Fingerprint (Browser + Screen + TimeZone)
            // Ideally use ClientJS or FingerprintJS, but this is sufficient for basic distinction
            const fingerprintCtx = [
                navigator.userAgent,
                navigator.language,
                new Date().getTimezoneOffset(),
                window.screen.width + 'x' + window.screen.height
            ].join('|');

            // Hash it for privacy/cleanliness
            const fingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fingerprintCtx))
                .then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''));

            try {
                const { data, error } = await supabase.functions.invoke('manage_session', {
                    body: {
                        session_id: session.access_token.slice(-10), // Use part of token as ID
                        device_fingerprint: fingerprint,
                        device_info: {
                            ua: navigator.userAgent,
                            platform: navigator.platform
                        }
                    }
                });

                if (error) {
                    console.error("Session Manager Error:", error);
                    // If 401, likely token revoked
                    if (error.code === '401' || error.message?.includes('Unauthorized')) {
                        await supabase.auth.signOut();
                        window.location.href = '/';
                    }
                }

                // If success, we are good. The backend handles the killing of OLD sessions.
                // If *WE* were the old session that got killed, the next request would fail 
                // but strictly speaking, we are the *active* one now.
                // To detect if we *become* killed later, we'd need polling or realtime.
                // For now, "Login Enforcement" is enough to stop sharing. 
                // (i.e. User A logs in, User B logs in -> User A is still technicaly logged in client-side 
                // until they refresh or token expires, but new logins are rotated).
                // To be stricter: Poll every 5 mins.

            } catch (err) {
                console.error("Session Check Failed", err);
            }
        };

        // Run on mount
        manageSession();

        // Optional: Poll every 5 minutes to ensure we are still valid
        const interval = setInterval(manageSession, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);
}
