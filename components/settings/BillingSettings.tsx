import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Check, ChevronRight, LayoutTemplate, X } from 'lucide-react';
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';

// New Components
import { PaymentMethodsManager } from './PaymentMethodsManager';
import { SubscriptionManager } from './SubscriptionManager';
import { InvoiceHistory } from './InvoiceHistory';
import { CustomCheckoutForm } from './CustomCheckoutForm';

interface Plan {
    id: string;
    name: string;
    type: string;
    price_monthly_usd: number;
    currency: string;
    features: string[];
}

export const BillingSettings: React.FC = () => {
    const { t } = useTranslation();
    const supabase = createClient();
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [showCheckout, setShowCheckout] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('plans')
            .select('*')
            .order('price_monthly_usd', { ascending: true });

        if (data) setAvailablePlans(data);
        setLoading(false);
    };

    const handleSelectPlan = (plan: Plan) => {
        setSelectedPlan(plan);
        setShowCheckout(true);
    };

    const handleCheckoutSuccess = () => {
        setShowCheckout(false);
        setSelectedPlan(null);
        toast.success('Assinatura realizada com sucesso!');
        // Refresh subscription data
        window.location.reload();
    };

    const handleCheckoutCancel = () => {
        setShowCheckout(false);
        setSelectedPlan(null);
    };

    const renderPlanCard = (plan: Plan) => (
        <div key={plan.id} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group relative">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                    <div className="text-2xl font-black text-indigo-600 mt-1">
                        ${plan.price_monthly_usd} <span className="text-sm text-slate-400 font-medium">/mês</span>
                    </div>
                </div>
                <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <LayoutTemplate size={20} />
                </div>
            </div>

            <ul className="space-y-3 mb-6">
                {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features)?.slice(0, 4).map((feat: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <Check size={16} className="text-emerald-500 shrink-0" /> {feat}
                    </li>
                ))}
            </ul>

            <Button
                onClick={() => handleSelectPlan(plan)}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
                Escolher Plano
                <ChevronRight size={16} className="ml-1" />
            </Button>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Checkout Modal */}
            {showCheckout && selectedPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800">Finalizar Compra</h3>
                            <Button variant="ghost" size="icon" onClick={handleCheckoutCancel} className="rounded-full">
                                <X size={20} />
                            </Button>
                        </div>
                        <div className="p-6">
                            <CustomCheckoutForm
                                plan={selectedPlan}
                                onSuccess={handleCheckoutSuccess}
                                onCancel={handleCheckoutCancel}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-slate-900">{t('settings.billing.title', 'Faturamento & Planos')}</h2>
                <p className="text-sm text-slate-500">{t('settings.billing.subtitle', 'Gerencie sua assinatura, métodos de pagamento e créditos de IA.')}</p>
            </div>

            {/* Subscription & Payment Methods Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                <SubscriptionManager onUpgrade={() => {
                    // Scroll to plans section
                    document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
                }} />
                <PaymentMethodsManager />
            </div>

            {/* Invoice History */}
            <InvoiceHistory />

            {/* Plans Section */}
            <div id="plans-section">
                <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <Zap className="text-amber-500" /> Planos Disponíveis
                </h3>

                {/* Combos */}
                {availablePlans.filter(p => p.type === 'combo').length > 0 && (
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">Combos (Sistema + Voz)</h4>
                        <div className="grid md:grid-cols-3 gap-6">
                            {availablePlans.filter(p => p.type === 'combo').map(renderPlanCard)}
                        </div>
                    </div>
                )}

                {/* System Only */}
                {availablePlans.filter(p => p.type === 'system').length > 0 && (
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">Sistema</h4>
                        <div className="grid md:grid-cols-2 gap-6">
                            {availablePlans.filter(p => p.type === 'system').map(renderPlanCard)}
                        </div>
                    </div>
                )}

                {/* Telephony Only */}
                {availablePlans.filter(p => p.type === 'telephony').length > 0 && (
                    <div className="mb-8">
                        <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">Planos de Voz</h4>
                        <div className="grid md:grid-cols-3 gap-6">
                            {availablePlans.filter(p => p.type === 'telephony').map(renderPlanCard)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
