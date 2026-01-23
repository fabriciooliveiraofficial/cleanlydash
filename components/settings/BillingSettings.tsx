import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Zap, Check, ChevronRight, Shield, RefreshCw, LayoutTemplate } from 'lucide-react'; // Changed LayoutDashboard to LayoutTemplate
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';

export const BillingSettings: React.FC = () => {
    const { t } = useTranslation();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [subscription, setSubscription] = useState<any>(null);
    const [aiCredits, setAiCredits] = useState(0);

    useEffect(() => {
        fetchSubscriptionData();
    }, []);

    const fetchSubscriptionData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: sub } = await supabase
            .from('tenant_subscriptions')
            .select('*')
            .eq('tenant_id', user.id)
            .maybeSingle();

        if (sub) {
            const subscriptionData = sub as any;
            setSubscription(subscriptionData);
            setAiCredits(subscriptionData.ai_credits || 0);
        }
    };

    const handleAction = async (action: 'portal' | 'subscription_update' | 'token_purchase', params: any = {}) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-billing-session', {
                body: { action, ...params, return_url: window.location.href }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                toast.error("Erro ao iniciar sessão de pagamento.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Erro: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const plans = [
        {
            id: 'plan_pro', // Replace with your actual Stripe Price ID or Plan ID
            name: 'Pro',
            price: 299,
            features: ['Gestão Completa', 'Multi-Crew', 'App do Cleaner', 'Pagamentos Online']
        },
        {
            id: 'plan_enterprise',
            name: 'Enterprise',
            price: 599,
            features: ['Tudo do Pro', 'IA Avançada', 'Suporte Dedicado', 'API Acesso']
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-slate-900">{t('settings.billing.title', 'Faturamento & Planos')}</h2>
                <p className="text-sm text-slate-500">{t('settings.billing.subtitle', 'Gerencie sua assinatura, métodos de pagamento e créditos de IA.')}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Current Plan Card */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                            <Shield size={24} />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Plano Atual</div>
                            <h3 className="text-xl font-black text-slate-900">{subscription?.plan_id ? subscription.plan_id.replace('plan_', '').toUpperCase() : 'FREE / TRIAL'}</h3>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                        <span className="text-sm font-medium text-slate-600">Status</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${subscription?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {subscription?.status || 'Active'}
                        </span>
                    </div>

                    <Button
                        onClick={() => handleAction('portal')}
                        disabled={loading}
                        className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-200"
                    >
                        <CreditCard size={16} className="mr-2" /> Gerenciar Assinatura & Cartões
                    </Button>
                </div>

                {/* AI Credits Card */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Zap size={120} />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                                <Zap size={24} className="text-yellow-400" fill="currentColor" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Saldo de IA</div>
                                <h3 className="text-3xl font-black">{aiCredits.toLocaleString()} <span className="text-sm opacity-60 font-medium">Tokens</span></h3>
                            </div>
                        </div>

                        <p className="text-sm text-slate-300 mb-6">
                            Tokens são utilizados para automações inteligentes, geração de descrições e respostas automáticas.
                        </p>

                        <Button
                            onClick={() => handleAction('token_purchase')}
                            disabled={loading}
                            className="w-full bg-yellow-400 hover:bg-yellow-300 text-black border-none font-bold"
                        >
                            Comprar 100k Tokens ($50)
                            <ChevronRight size={16} className="ml-1 opacity-60" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Available Plans */}
            <div className="pt-8 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Planos Disponíveis</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    {plans.map(plan => (
                        <div key={plan.id} className="bg-white p-6 rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                                    <div className="text-2xl font-black text-indigo-600 mt-1">
                                        R$ {plan.price} <span className="text-sm text-slate-400 font-medium">/mês</span>
                                    </div>
                                </div>
                                <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <LayoutTemplate size={20} />
                                </div>
                            </div>

                            <ul className="space-y-3 mb-6">
                                {plan.features.map(feat => (
                                    <li key={feat} className="flex items-center gap-2 text-sm text-slate-600">
                                        <Check size={16} className="text-emerald-500" /> {feat}
                                    </li>
                                ))}
                            </ul>

                            <Button
                                onClick={() => handleAction('subscription_update', { plan_id: plan.id })}
                                disabled={loading || subscription?.plan_id === plan.id}
                                className={`w-full ${subscription?.plan_id === plan.id ? 'bg-emerald-100 text-emerald-700 cursor-default hover:bg-emerald-100' : ''}`}
                            >
                                {subscription?.plan_id === plan.id ? 'Plano Atual' : 'Fazer Upgrade'}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
