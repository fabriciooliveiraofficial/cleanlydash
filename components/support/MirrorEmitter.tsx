import React, { useEffect, useState, useRef } from 'react';
import * as rrweb from 'rrweb';
import { createClient } from '../../lib/supabase/client';

/**
 * MirrorEmitter: Silently listens for support requests and streams DOM events.
 * Only activates when a "mirror_request" is received on the tenant channel.
 */
export const MirrorEmitter: React.FC<{ tenantId: string; userId: string }> = ({ tenantId, userId }) => {
    const supabase = createClient();
    const [isMirroring, setIsMirroring] = useState(false);
    const stopFnRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!tenantId || !userId) return;

        const channel = supabase.channel(`support_session:${tenantId}`, {
            config: { broadcast: { self: false } }
        });

        channel
            .on('broadcast', { event: 'request_mirror' }, ({ payload }) => {
                console.log('[ShadowView] Mirror requested by admin:', payload.adminId);
                setIsMirroring(true);
            })
            .on('broadcast', { event: 'stop_mirror' }, () => {
                console.log('[ShadowView] Mirror stopped by admin');
                setIsMirroring(false);
            })
            .subscribe();

        return () => {
            if (stopFnRef.current) stopFnRef.current();
            supabase.removeChannel(channel);
        };
    }, [tenantId, userId, supabase]);

    useEffect(() => {
        if (!isMirroring) {
            if (stopFnRef.current) {
                stopFnRef.current();
                stopFnRef.current = null;
            }
            return;
        }

        console.log('[ShadowView] ⚡ Starting DOM Stream');
        const channel = supabase.channel(`support_stream:${tenantId}`);

        channel.subscribe((status) => {
            if (status !== 'SUBSCRIBED') return;

            stopFnRef.current = rrweb.record({
                emit(event) {
                    channel.send({
                        type: 'broadcast',
                        event: 'dom_event',
                        payload: event
                    });
                },
                maskAllInputs: true, // Privacy first
                sampling: {
                    mousemove: 50, // Smooth cursor but sampled
                    scroll: 150
                }
            }) || null;
        });

        return () => {
            if (stopFnRef.current) stopFnRef.current();
            supabase.removeChannel(channel);
        };
    }, [isMirroring, tenantId, userId, supabase]);

    return null;
};
