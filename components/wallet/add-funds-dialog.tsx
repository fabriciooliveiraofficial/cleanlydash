import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { createClient } from '../../lib/supabase/client';
import { CreditCard, Sparkles } from 'lucide-react';

export const AddFundsDialog = ({ onSuccess }: { onSuccess?: () => void }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const packs = [
        { tokens: 100, price: 10, label: 'Starter' },
        { tokens: 500, price: 45, label: 'Growth' },
        { tokens: 1000, price: 80, label: 'Scale' },
    ];

    const handlePurchase = async (pack: { tokens: number, price: number, label: string }) => {
        setLoading(true);
        const user = (await supabase.auth.getUser()).data.user;

        if (!user) return;

        // Simulate Stripe
        await new Promise(r => setTimeout(r, 1500));

        const { error } = await supabase.from('wallet_ledger').insert({
            tenant_id: (user?.user_metadata as any)?.tenant_id,
            description: `Purchased ${pack.tokens} Tokens (${pack.label})`,
            amount: pack.tokens
        } as any);

        setLoading(false);

        if (error) {
            toast.error("Payment Failed");
        } else {
            toast.success(`+${pack.tokens} Tokens Added!`);
            setOpen(false);
            if (onSuccess) onSuccess();
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
