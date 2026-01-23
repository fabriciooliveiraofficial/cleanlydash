import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface StripeCheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientSecret: string | null;
}

export const StripeCheckoutModal: React.FC<StripeCheckoutModalProps> = ({ isOpen, onClose, clientSecret }) => {
    if (!isOpen || !clientSecret) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-lg font-bold text-slate-800">Checkout Seguro</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200">
                        <X size={20} />
                    </Button>
                </div>

                {/* Checkout Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    <EmbeddedCheckoutProvider
                        stripe={stripePromise}
                        options={{ clientSecret }}
                    >
                        <EmbeddedCheckout className="h-full w-full" />
                    </EmbeddedCheckoutProvider>
                </div>
            </div>
        </div>
    );
};
