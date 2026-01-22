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

            // 1. Atomic UPSERT for session tracking
            // This prevents race conditions and 409 conflicts
            const { error: upsertError } = await (supabase
                .from('active_sessions') as any)
                .upsert({
                    user_id: user.id,
                    session_id: currentSessionId,
                    device_fingerprint: navigator.userAgent,
                    last_active_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,session_id'
                });

            if (upsertError) {
                console.warn('Session Sync Error:', upsertError);
            }

            // 2. Heartbeat Logic (Update Only)
            const updateHeartbeat = async () => {
                // We only UPDATE. If the row is gone (deleted by another login), this returns count=0
                const { error, count } = await (supabase
                    .from('active_sessions') as any)
                    .update({ last_active_at: new Date().toISOString() })
                    .eq('session_id', currentSessionId)
                    .eq('user_id', user.id) // Security constraint
                    .select('id', { count: 'exact' });

                if (count === 0) {
                    // Session killed by another device
                    console.warn("Session invalidated by concurrency control.");
                    clearInterval(heartbeatInterval);
                    alert("Sua sessão foi encerrada porque você entrou em outro dispositivo.\n\nPor segurança, apenas uma sessão ativa é permitida.");
                    await supabase.auth.signOut();
                    window.location.href = '/login'; // Force reload
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
