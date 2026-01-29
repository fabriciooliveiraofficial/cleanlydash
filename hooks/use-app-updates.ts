import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { createClient } from '../lib/supabase/client';

export type UpdateSource = 'pwa' | 'manual' | 'realtime';

interface UpdateState {
    needRefresh: boolean;
    version?: string;
    source?: UpdateSource;
    message?: string;
}

export function useAppUpdates() {
    const [updateState, setUpdateState] = useState<UpdateState>({
        needRefresh: false,
    });

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('[ReleaseGuard] SW Registered:', r);
        },
        onRegisterError(error) {
            console.error('[ReleaseGuard] SW registration error:', error);
        },
    });

    // Detect PWA update
    useEffect(() => {
        if (needRefresh) {
            setUpdateState({
                needRefresh: true,
                source: 'pwa',
                message: 'Uma nova versão do Cleanlydash está disponível.'
            });
        }
    }, [needRefresh]);

    // Supabase Realtime Bridge for "Force Push"
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel('app-releases', {
            config: { broadcast: { self: false } }
        });

        channel
            .on('broadcast', { event: 'new_release' }, ({ payload }) => {
                console.log('[ReleaseGuard] 🚀 Manual push received:', payload);
                setUpdateState({
                    needRefresh: true,
                    source: 'realtime',
                    version: payload.version,
                    message: payload.message || 'Atualização importante disponível!'
                });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const performUpdate = useCallback(() => {
        console.log('[ReleaseGuard] Performance update requested...');
        if (updateState.source === 'pwa') {
            updateServiceWorker(true);
        } else {
            // For manual/realtime, we just do a hard refresh
            window.location.reload();
        }
    }, [updateState.source, updateServiceWorker]);

    const dismissUpdate = useCallback(() => {
        setUpdateState({ needRefresh: false });
        setNeedRefresh(false);
    }, [setNeedRefresh]);

    return {
        ...updateState,
        performUpdate,
        dismissUpdate,
    };
}
