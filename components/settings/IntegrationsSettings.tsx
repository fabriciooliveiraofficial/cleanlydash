import React, { useEffect, useState } from 'react';
import { CreditCard, CheckCircle, ExternalLink, AlertCircle, Calendar, MessageSquare, Plus } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { ConnectStripeButton } from '../platform/finance/ConnectStripeButton';

interface IntegrationData {
    stripe_account_id: string | null;
    stripe_status: 'disconnected' | 'pending' | 'active' | 'restricted';
    stripe_details: any;
}

interface IntegrationCardProps {
    id: string;
    title: string;
    description: string;
    icon: any;
    status: 'connected' | 'disconnected' | 'coming_soon';
    onConnect?: () => void;
    onManage?: () => void;
    meta?: React.ReactNode;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ title, description, icon: Icon, status, onConnect, onManage, meta }) => (
    <div className={`flex flex-col p-6 rounded-2xl border transition-all duration-300 ${status === 'connected' ? 'bg-white border-green-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'}`}>
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${status === 'connected' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                <Icon size={24} />
            </div>
            {status === 'connected' && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    <CheckCircle size={12} /> Active
                </span>
            )}
            {status === 'coming_soon' && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                    Coming Soon
                </span>
            )}
        </div>

        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 flex-1 leading-relaxed">{description}</p>

        {meta && <div className="mb-6 pt-4 border-t border-slate-50">{meta}</div>}

        <div className="mt-auto">
            {status === 'connected' ? (
                <button
                    onClick={onManage}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                    Manage Settings <ExternalLink size={16} />
                </button>
            ) : status === 'coming_soon' ? (
                <button disabled className="w-full py-2.5 rounded-lg border border-dashed border-slate-200 text-slate-400 font-medium cursor-not-allowed">
                    Notify Me
                </button>
            ) : (
                <button
                    onClick={onConnect}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition-transform active:scale-95 shadow-lg shadow-slate-200"
                >
                    <Plus size={16} /> Connect
                </button>
            )}
        </div>
    </div>
);

export const IntegrationsSettings: React.FC = () => {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [integration, setIntegration] = useState<IntegrationData>({
        stripe_account_id: null,
        stripe_status: 'disconnected',
        stripe_details: {}
    });

    useEffect(() => {
        fetchIntegration();
    }, []);

    const fetchIntegration = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('tenant_integrations')
                .select('*')
                .eq('tenant_id', user.id)
                .single();

            if (data) setIntegration(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectStripe = () => {
        toast.info("Em produção, isso redirecionará para o Stripe OAuth.");
    };

    const handleManageStripe = () => {
        window.open(`https://dashboard.stripe.com/`, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading marketplace...</div>;

    const isStripeConnected = integration.stripe_status === 'active' || !!integration.stripe_account_id;

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">App Marketplace</h2>
                <p className="text-slate-500 mt-1">Supercharge your Cleanlydash workspace by connecting your favorite tools.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* 1. Stripe (Core) */}
                <div className={`flex flex-col p-6 rounded-2xl border transition-all duration-300 ${isStripeConnected ? 'bg-white border-green-200 shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md'}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${isStripeConnected ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'}`}>
                            <CreditCard size={24} />
                        </div>
                        {isStripeConnected && (
                            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                <CheckCircle size={12} /> Active
                            </span>
                        )}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 mb-2">Stripe Payments</h3>
                    <p className="text-sm text-slate-500 mb-6 flex-1 leading-relaxed">
                        Accept credit cards, manage payouts, and handle refunds directly from your dashboard. Required for billing.
                    </p>

                    {isStripeConnected && (
                        <div className="mb-6 pt-4 border-t border-slate-50 grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-slate-50 rounded">
                                <span className="text-slate-400 block mb-1">Charges</span>
                                <span className={`font-bold ${integration.stripe_details?.charges_enabled ? 'text-green-600' : 'text-amber-600'}`}>
                                    {integration.stripe_details?.charges_enabled ? 'Enabled' : 'Pending'}
                                </span>
                            </div>
                            <div className="p-2 bg-slate-50 rounded">
                                <span className="text-slate-400 block mb-1">Payouts</span>
                                <span className={`font-bold ${integration.stripe_details?.payouts_enabled ? 'text-green-600' : 'text-amber-600'}`}>
                                    {integration.stripe_details?.payouts_enabled ? 'Enabled' : 'Pending'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="mt-auto">
                        <ConnectStripeButton
                            connectedAccountId={integration.stripe_account_id || undefined}
                        />
                    </div>
                </div>

                {/* 2. Google Calendar (Future) */}
                <IntegrationCard
                    id="gcal"
                    title="Google Calendar"
                    description="Sync your team's shifts and booking schedules with Google Calendar automatically."
                    icon={Calendar}
                    status="coming_soon"
                />

                {/* 3. Slack (Future) */}
                <IntegrationCard
                    id="slack"
                    title="Slack Notifications"
                    description="Receive instant alerts for new bookings and VIP requests directly in your Slack channels."
                    icon={MessageSquare}
                    status="coming_soon"
                />
            </div>
        </div>
    );
};
