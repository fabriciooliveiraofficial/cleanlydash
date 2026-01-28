import { useState, useCallback, useEffect } from 'react';
import { createClient } from '../lib/supabase/client';
import { toast } from 'sonner';
import type { SupabaseClient } from '@supabase/supabase-js';

const VAPID_PUBLIC_KEY = 'BFYafKev2VjfDUhglqdYzio6XEMfBLgV4e2LlIgprpaQPoCEVHotFXiaOF0SdgE5izr-X6DI3jdG939wAqzWAq0';

interface UseNotificationsOptions {
    supabaseClient?: SupabaseClient;
}

export function useNotifications(options?: UseNotificationsOptions) {
    const supabase = options?.supabaseClient || createClient();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkSubscription = useCallback(async () => {
        console.log('[Push] Checking subscription status...');
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('[Push] Push notifications not supported by this browser');
            setLoading(false);
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            console.log('[Push] Service Worker ready:', registration.scope);
            const subscription = await registration.pushManager.getSubscription();
            console.log('[Push] Current subscription:', subscription ? 'Exists' : 'None');
            setIsSubscribed(!!subscription);
        } catch (err) {
            console.error('[Push] Error checking subscription:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSubscription();
    }, [checkSubscription]);

    const subscribe = useCallback(async (appContext: 'platform' | 'tenant' | 'cleaner') => {
        console.log('[Push] Initiating subscription for context:', appContext);
        try {
            const permission = await Notification.requestPermission();
            console.log('[Push] Permission state:', permission);
            if (permission !== 'granted') {
                toast.error('Permissão de notificação negada.');
                return false;
            }

            const registration = await navigator.serviceWorker.ready;
            console.log('[Push] Service worker ready for subscription');

            // Convert VAPID key to Uint8Array
            const padding = '='.repeat((4 - (VAPID_PUBLIC_KEY.length % 4)) % 4);
            const base64 = (VAPID_PUBLIC_KEY + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }

            console.log('[Push] Registering with Push service...');
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: outputArray
            });

            console.log('[Push] Initialized subscription successfully');
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const subJson = subscription.toJSON();

            const { error } = await supabase.from('push_subscriptions').upsert({
                user_id: user.id,
                endpoint: subJson.endpoint,
                p256dh: subJson.keys?.p256dh,
                auth: subJson.keys?.auth,
                app_context: appContext,
                device_type: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
                last_seen_at: new Date().toISOString()
            }, { onConflict: 'endpoint' });

            if (error) {
                console.error('[Push] Database sync failed:', error);
                throw error;
            }

            setIsSubscribed(true);
            toast.success('Notificações ativadas com sucesso!');
            return true;
        } catch (err: any) {
            console.error('[Push] Subscription process failed:', err);
            toast.error('Erro ao ativar notificações: ' + err.message);
            return false;
        }
    }, [supabase]);

    const unsubscribe = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();

                // Remove from database
                await supabase
                    .from('push_subscriptions')
                    .delete()
                    .eq('endpoint', subscription.endpoint);
            }
            setIsSubscribed(false);
            toast.success('Notificações desativadas.');
        } catch (err: any) {
            console.error('Unsubscribe error:', err);
            toast.error('Erro ao desativar notificações.');
        }
    }, [supabase]);

    return {
        isSubscribed,
        loading,
        subscribe,
        unsubscribe,
        checkSubscription
    };
}
