import React, { useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export const SessionTracker: React.FC = () => {
    const supabase = createClient();
    const sessionId = React.useRef(uuidv4()); // Unique ID for this browser tab

    useEffect(() => {
        let heartbeatInterval: NodeJS.Timeout;
        const currentSessionId = sessionId.current;

        const startTracking = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Resilient sync logic: Check if this exact session_id exists first
            try {
                const { data: existingSession } = await (supabase
                    .from('active_sessions') as any)
                    .select('id')
                    .eq('session_id', currentSessionId)
                    .maybeSingle();

                if (!existingSession) {
                    const { error: upsertError } = await (supabase
                        .from('active_sessions') as any)
                        .upsert({
                            user_id: user.id,
                            session_id: currentSessionId,
                            device_fingerprint: navigator.userAgent,
                            last_active_at: new Date().toISOString()
                        }, { onConflict: 'session_id' });

                    if (upsertError) {
                        console.warn('[SessionTracker] Initial sync warning:', upsertError.message);
                    }
                }
            } catch (e) {
                console.error('[SessionTracker] Critical sync error:', e);
            }

            // 2. Heartbeat Logic (Update Only)
            const updateHeartbeat = async () => {
                const { error, count } = await (supabase
                    .from('active_sessions') as any)
                    .update({ last_active_at: new Date().toISOString() })
                    .eq('session_id', currentSessionId)
                    .eq('user_id', user.id)
                    .select('id', { count: 'exact' });

                if (count === 0) {
                    // Session record missing or deleted
                    console.warn("[SessionTracker] Session heartbeat returned 0 records. Tracking may be inconsistent.");
                }
            };

            // Heartbeat every 2 minutes
            heartbeatInterval = setInterval(updateHeartbeat, 2 * 60 * 1000); // 2 mins

            // Periodic cleanup on close
            window.addEventListener('beforeunload', async () => {
                await supabase.from('active_sessions').delete().eq('session_id', currentSessionId);
            });
        };

        startTracking();

        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            supabase.from('active_sessions').delete().eq('session_id', currentSessionId);
        };
    }, []);

    return null; // Invisible component
};
