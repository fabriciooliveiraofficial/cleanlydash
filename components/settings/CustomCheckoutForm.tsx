import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, X, Check, ShieldCheck } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface Plan {
    id: string;
    name: string;
    price_monthly_usd: number;
    currency: string;
    features: string[];
}

interface CustomCheckoutFormProps {
    plan: Plan;
    onSuccess: () => void;
    onCancel: () => void;
}

const CheckoutFormContent: React.FC<CustomCheckoutFormProps & { clientSecret: string }> = ({
    plan,
    onSuccess,
    onCancel,
    clientSecret
}) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setLoading(true);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                confirmParams: {
                    return_url: window.location.href,
                },
                redirect: 'if_required',
            });

            if (error) {
                throw new Error(error.message);
            }

            if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
                toast.success('Pagamento realizado com sucesso!');
                onSuccess();
            } else if (paymentIntent?.status === 'requires_action') {
                toast.info('Aguardando confirmação adicional...');
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            toast.error(err.message || 'Erro ao processar pagamento');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Plan Summary */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Plano Selecionado</p>
                        <h4 className="text-xl font-black text-slate-900 mt-1">{plan.name}</h4>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-black text-indigo-600">
                            ${plan.price_monthly_usd}
                        </p>
                        <p className="text-xs text-slate-500">/mês</p>
                    </div>
                </div>

                {plan.features && plan.features.length > 0 && (
                    <ul className="mt-4 space-y-2 border-t border-indigo-100 pt-4">
                        {(typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features).slice(0, 3).map((feat: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                <Check size={14} className="text-emerald-500" />
                                {feat}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Payment Element */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">
                    Dados de Pagamento
                </label>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <PaymentElement
                        onReady={() => setReady(true)}
                        options={{
                            layout: 'tabs',
                        }}
                    />
                </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Pagamento seguro via Stripe. Seus dados estão protegidos.</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    type="submit"
                    disabled={!stripe || !ready || loading}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 text-base font-bold"
                >
                    {loading ? (
                        <>
                            <Loader2 size={18} className="animate-spin mr-2" />
                            Processando...
                        </>
                    ) : (
                        `Assinar por $${plan.price_monthly_usd}/mês`
                    )}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4"
                >
                    <X size={18} />
                </Button>
            </div>
        </form>
    );
};

export const CustomCheckoutForm: React.FC<CustomCheckoutFormProps> = ({ plan, onSuccess, onCancel }) => {
    const supabase = createClient();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        createSubscription();
    }, [plan.id]);

    const createSubscription = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Not authenticated');

            // Create subscription with database plan_id
            const { data, error } = await supabase.functions.invoke('stripe-subscriptions', {
                body: {
                    action: 'create',
                    plan_id: plan.id, // Database plan ID - backend will create Stripe price
                },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) throw error;

            if (data?.clientSecret) {
                setClientSecret(data.clientSecret);
            } else {
                throw new Error('No client secret received');
            }
        } catch (err: any) {
            console.error('Error creating subscription:', err);
            setError(err.message);
            toast.error('Erro ao preparar checkout');
        }
    };

    if (error) {
        return (
            <div className="p-6 text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={onCancel} variant="outline">Fechar</Button>
            </div>
        );
    }

    if (!clientSecret) {
        return (
            <div className="p-8 flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        );
    }

    return (
        <Elements
            stripe={stripePromise}
            options={{
                clientSecret,
                appearance: {
                    theme: 'stripe',
                    variables: {
                        colorPrimary: '#4f46e5',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        borderRadius: '12px',
                    },
                },
            }}
        >
            <CheckoutFormContent
                plan={plan}
                onSuccess={onSuccess}
                onCancel={onCancel}
                clientSecret={clientSecret}
            />
        </Elements>
    );
};
