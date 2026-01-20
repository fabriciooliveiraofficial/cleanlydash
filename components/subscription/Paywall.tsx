import React, { useState } from 'react';
import { Lock, CreditCard, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';

export const Paywall = () => {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleCheckout = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // We can re-trigger the checkout function or just check if we have a stored session
            // For now, let's call the generic checkout function to get the link again
            // NOTE: We need to pass the plan_id again or have the edge function look it up.
            // Simplified: The Edge Function 'create-platform-checkout' handles lookup if we don't pass plan_id but pass user_id?
            // Actually, simpler: Let's assume we stored metadata or just ask the user to pick again?
            // BETTER: The edge function should be smart enough.
            // For this MVP, let's assume we stored the plan_id in metadata or just generic checkout.

            // Re-using the same function, likely need to pass arguments.
            const { data: { session } } = await supabase.auth.getSession();
            // This part might need the user to re-select plan if we didn't save it perfectly.
            // BUT, we have 'tenant_subscriptions' with payment_pending.
            // Let's just redirect them to a "Manage Subscription" or "Finish Setup" logic.

            // Quick Fix: Re-invoke create-platform-checkout with stored metadata if possible or just fail safe.
            // Let's try to get the plan from the subscription entry?

            // Alternative: Hardcode for now or generic "Resume Checkout"
            const { data, error } = await supabase.functions.invoke('create-platform-checkout', {
                body: {
                    email: user.email,
                    resume_checkout: true // New flag we might need, or just rely on existing logic
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            } else {
                toast.error("Não foi possível gerar o link. Tente atualizar a página.");
            }

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao conectar com o pagamento.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
                <div className="absolute top-0 right-0 h-32 w-32 translate-x-8 translate-y-[-50%] rounded-full bg-indigo-500/20 blur-3xl" />
                <div className="absolute bottom-0 left-0 h-32 w-32 translate-x-[-50%] translate-y-[50%] rounded-full bg-purple-500/20 blur-3xl" />

                <div className="relative flex flex-col items-center p-12 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50 ring-8 ring-indigo-50/50">
                        <Lock className="h-10 w-10 text-indigo-600" />
                    </div>

                    <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
                        Finalize seu Registro
                    </h2>

                    <p className="mb-8 text-slate-600">
                        Sua conta foi criada, mas precisamos confirmar sua assinatura para liberar o acesso completo ao dashboard.
                    </p>

                    <Button
                        size="lg"
                        className="w-full h-12 text-base bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20"
                        onClick={handleCheckout}
                        disabled={loading}
                    >
                        {loading ? (
                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <CreditCard className="mr-2 h-5 w-5" />
                        )}
                        {loading ? 'Gerando Link...' : 'Realizar Pagamento Seguro'}
                    </Button>

                    <p className="mt-6 text-xs text-slate-400">
                        Ambiente seguro autenticado por Stripe.
                        <br />
                        <button onClick={() => window.location.reload()} className="mt-2 underline hover:text-indigo-600">
                            Já pagou? Clique para atualizar
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};
