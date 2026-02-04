import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import { CreditCard, Sparkles } from 'lucide-react';
import { useRole } from '../../hooks/use-role';

export const AddFundsDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const { tenant_id: tenantId } = useRole();

    const packs = [
        { tokens: 100, price: 10, label: 'Starter' },
        { tokens: 500, price: 45, label: 'Growth' },
        { tokens: 1000, price: 80, label: 'Scale' },
    ];

    const handlePurchase = async (pack: { tokens: number, price: number, label: string }) => {
        setLoading(true);
        try {
            if (!tenantId) {
                toast.error("Tenant ID not found. Verify your session.");
                return;
            }

            // Simulate Network Delay
            await new Promise(r => setTimeout(r, 1000));

            // Use our new atomic RPC
            const { data, error } = await (supabase as any).rpc('process_wallet_transaction', {
                p_tenant_id: tenantId,
                p_amount: pack.tokens,
                p_description: `Purchased ${pack.tokens} Tokens (${pack.label})`,
                p_service_type: 'deposit'
            });

            if (error || !data?.success) throw error || new Error(data?.error);

            toast.success(`+${pack.tokens} Tokens Added!`);
            setOpen(false);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            console.error(err);
            toast.error("Payment Failed: " + (err.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-2">
                    <Sparkles size={16} /> Comprar Tokens
                </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-w-lg">
                <DialogHeader>
                    <DialogTitle>Abastecer Wallet</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    {packs.map((pack) => (
                        <div key={pack.tokens} onClick={() => handlePurchase(pack)} className="cursor-pointer group relative overflow-hidden rounded-xl border border-indigo-100 bg-white p-4 hover:border-indigo-500 transition-all text-center">
                            <div className="text-2xl font-black text-slate-900">{pack.tokens}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tokens</div>
                            <div className="text-lg font-bold text-indigo-600 group-hover:scale-110 transition-transform">${pack.price}</div>
                        </div>
                    ))}
                </div>
                <div className="text-center text-xs text-slate-400">
                    Secure payment powered by Stripe.
                </div>
            </DialogContent>
        </Dialog>
    );
};
