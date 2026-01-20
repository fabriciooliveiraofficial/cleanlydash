import React from 'react';
import { useSubscription } from '../../hooks/use-subscription';
import { Paywall } from './Paywall';

interface SubscriptionGateProps {
    children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
    const { status, loading } = useSubscription();

    // While determining status, we might show a skeleton or just render children transparently
    // For better UX, let's show children but maybe with a loading overlay if strictly needed
    // Or just wait. Given it's a gate, we should wait.
    if (loading) {
        return null; // Or a spinner
    }

    // Gating Logic
    if (status === 'payment_pending' || status === 'past_due') {
        return <Paywall />;
    }

    return <>{children}</>;
};
