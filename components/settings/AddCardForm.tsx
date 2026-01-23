import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, X } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface AddCardFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

const CardForm: React.FC<AddCardFormProps> = ({ onSuccess, onCancel }) => {
    const stripe = useStripe();
    const elements = useElements();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    useEffect(() => {
        createSetupIntent();
    }, []);

    const createSetupIntent = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Not authenticated');

            const { data, error } = await supabase.functions.invoke('stripe-payment-methods', {
                method: 'POST',
                body: { action: 'create_setup_intent' },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) throw error;
            setClientSecret(data?.clientSecret);
        } catch (err: any) {
            console.error('Error creating setup intent:', err);
            toast.error('Erro ao preparar formulário');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements || !clientSecret) {
            return;
        }

        setLoading(true);

        try {
            const cardElement = elements.getElement(CardElement);
            if (!cardElement) throw new Error('Card element not found');

            const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
                payment_method: {
                    card: cardElement,
                },
            });

            if (error) {
                throw new Error(error.message);
            }

            if (setupIntent.status === 'succeeded') {
                toast.success('Cartão adicionado com sucesso!');
                onSuccess();
            }
        } catch (err: any) {
            console.error('Error adding card:', err);
            toast.error(err.message || 'Erro ao adicionar cartão');
        } finally {
            setLoading(false);
        }
    };

    const cardElementOptions = {
        style: {
            base: {
                fontSize: '16px',
                color: '#1e293b',
                '::placeholder': {
                    color: '#94a3b8',
                },
                fontFamily: 'Inter, system-ui, sans-serif',
            },
            invalid: {
                color: '#ef4444',
            },
        },
        hidePostalCode: true,
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
                {clientSecret ? (
                    <CardElement options={cardElementOptions} />
                ) : (
                    <div className="flex items-center justify-center py-2">
                        <Loader2 className="animate-spin text-slate-400" size={20} />
                    </div>
                )}
            </div>

            <div className="flex gap-3">
                <Button
                    type="submit"
                    disabled={!stripe || loading || !clientSecret}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                    {loading ? (
                        <>
                            <Loader2 size={16} className="animate-spin mr-2" />
                            Salvando...
                        </>
                    ) : (
                        'Salvar Cartão'
                    )}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                >
                    <X size={16} />
                </Button>
            </div>
        </form>
    );
};

export const AddCardForm: React.FC<AddCardFormProps> = (props) => {
    return (
        <Elements stripe={stripePromise}>
            <CardForm {...props} />
        </Elements>
    );
};
