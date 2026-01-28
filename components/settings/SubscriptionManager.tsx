import React, { useState, useEffect } from 'react';
import { Shield, Calendar, AlertCircle, ArrowUpRight, Loader2, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';

interface Subscription {
    id: string;
    status: string;
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    plan: {
        id: string;
        name: string;
        amount: number;
        currency: string;
        interval: string;
    };
    default_payment_method: {
        id: string;
        brand: string;
        last4: string;
    } | null;
}

interface SubscriptionManagerProps {
    onUpgrade?: () => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ onUpgrade }) => {
    const supabase = createClient();
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchSubscription();
    }, []);

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    };

    const fetchSubscription = async () => {
        setLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');

            const { data, error } = await supabase.functions.invoke('stripe-subscriptions', {
                body: { action: 'get' },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) {
                console.error('Error fetching subscription:', error);
                if (error && typeof error === 'object' && 'context' in error) {
                    try {
                        const responseBody = await (error as any).context.json();
                        console.error('Stripe Function Error Detail:', responseBody);
                    } catch (e) {
                        console.error('Could not parse Stripe Error body');
                    }
                }
                throw error;
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Tem certeza que deseja cancelar sua assinatura? Você ainda terá acesso até o fim do período atual.')) {
            return;
        }

        setActionLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');

            const { error } = await supabase.functions.invoke('stripe-subscriptions', {
                method: 'POST',
                body: { action: 'cancel' },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) throw error;
            toast.success('Assinatura cancelada. Acesso válido até o fim do período.');
            fetchSubscription();
        } catch (err: any) {
            toast.error('Erro ao cancelar assinatura');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReactivate = async () => {
        setActionLoading(true);
        try {
            const token = await getAuthToken();
            if (!token) throw new Error('Not authenticated');

            const { error } = await supabase.functions.invoke('stripe-subscriptions', {
                method: 'POST',
                body: { action: 'reactivate' },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) throw error;
            toast.success('Assinatura reativada!');
            fetchSubscription();
        } catch (err: any) {
            toast.error('Erro ao reativar assinatura');
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatAmount = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };

    const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
        if (cancelAtPeriodEnd) {
            return (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                    Cancela em breve
                </span>
            );
        }

        switch (status) {
            case 'active':
                return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Ativo</span>;
            case 'trialing':
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Trial</span>;
            case 'past_due':
                return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Pagamento Pendente</span>;
            case 'canceled':
                return <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full">Cancelada</span>;
            default:
                return <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Sua Assinatura</h3>
                        <p className="text-xs text-slate-500">Nenhuma assinatura ativa</p>
                    </div>
                </div>

                <div className="text-center py-6">
                    <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-slate-500 mb-4">Você ainda não possui uma assinatura.</p>
                    {onUpgrade && (
                        <Button onClick={onUpgrade} className="bg-indigo-600 hover:bg-indigo-700">
                            <ArrowUpRight size={16} className="mr-2" />
                            Escolher um Plano
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Sua Assinatura</h3>
                        <p className="text-xs text-slate-500">Gerencie seu plano</p>
                    </div>
                </div>
                {getStatusBadge(subscription.status, subscription.cancel_at_period_end)}
            </div>

            <div className="space-y-4">
                {/* Plan Info */}
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Plano Atual</p>
                            <h4 className="text-xl font-black text-slate-900 mt-1">{subscription.plan.name}</h4>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-indigo-600">
                                {formatAmount(subscription.plan.amount, subscription.plan.currency)}
                            </p>
                            <p className="text-xs text-slate-500">/{subscription.plan.interval === 'month' ? 'mês' : 'ano'}</p>
                        </div>
                    </div>
                </div>

                {/* Billing Cycle */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <Calendar size={16} className="text-slate-400" />
                    <div className="text-sm">
                        <span className="text-slate-500">Próxima cobrança: </span>
                        <span className="font-medium text-slate-700">{formatDate(subscription.current_period_end)}</span>
                    </div>
                </div>

                {/* Payment Method */}
                {subscription.default_payment_method && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <span className="text-lg">💳</span>
                        <div className="text-sm">
                            <span className="text-slate-500">Cartão: </span>
                            <span className="font-medium text-slate-700">
                                {subscription.default_payment_method.brand} •••• {subscription.default_payment_method.last4}
                            </span>
                        </div>
                    </div>
                )}

                {/* Cancel Warning */}
                {subscription.cancel_at_period_end && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-800">Cancelamento agendado</p>
                                <p className="text-sm text-amber-700 mt-1">
                                    Sua assinatura será cancelada em {formatDate(subscription.current_period_end)}.
                                    Você ainda terá acesso até essa data.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    {subscription.cancel_at_period_end ? (
                        <Button
                            onClick={handleReactivate}
                            disabled={actionLoading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                            {actionLoading ? (
                                <Loader2 size={16} className="animate-spin mr-2" />
                            ) : (
                                <RefreshCw size={16} className="mr-2" />
                            )}
                            Reativar Assinatura
                        </Button>
                    ) : (
                        <>
                            {onUpgrade && (
                                <Button
                                    onClick={onUpgrade}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                                >
                                    <ArrowUpRight size={16} className="mr-2" />
                                    Mudar Plano
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                onClick={handleCancel}
                                disabled={actionLoading}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                                {actionLoading ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <XCircle size={16} />
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
