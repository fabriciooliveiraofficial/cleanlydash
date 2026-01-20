import React from 'react';
import { useFeatures } from '../../contexts/features-context';
import { Lock } from 'lucide-react';
import { Button } from '../ui/button';

interface FeatureGateProps {
    feature: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showUnlock?: boolean; // If true, shows a default "Upgrade to Unlock" card
}

export const FeatureGate: React.FC<FeatureGateProps> = ({ feature, children, fallback, showUnlock }) => {
    const { canAccess, loading } = useFeatures();

    if (loading) return null; // Or skeleton

    if (canAccess(feature)) {
        return <>{children}</>;
    }

    if (showUnlock) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-xl border-dashed min-h-[200px] text-center">
                <div className="h-12 w-12 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mb-4">
                    <Lock size={20} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Recurso Premium Bloqueado</h3>
                <p className="text-sm text-slate-500 max-w-xs mb-4">
                    Seu plano atual não inclui acesso a <strong>{feature}</strong>. Faça upgrade para desbloquear.
                </p>
                <Button variant="outline" onClick={() => window.open('https://cleanlydash.com/pricing', '_blank')}>
                    Ver Planos
                </Button>
            </div>
        );
    }

    return <>{fallback || null}</>;
};
