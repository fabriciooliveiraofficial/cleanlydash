import { useEffect, useState } from 'react';
import { createClient } from '../lib/supabase/client';

export type SubscriptionStatus = 'active' | 'payment_pending' | 'past_due' | 'canceled' | 'trialing' | null;

export function useSubscription() {
    const [status, setStatus] = useState<SubscriptionStatus>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchSubscription() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('tenant_subscriptions')
                .select('status')
                .eq('tenant_id', user.id)
                .maybeSingle();

            if (!error && data) {
                setStatus(data.status as SubscriptionStatus);
            } else {
                // Fallback for tricky cases or if not found (default to safe state or null)
                setStatus(null);
            }
            setLoading(false);
        }

        fetchSubscription();
    }, []);

    return { status, loading };
}
