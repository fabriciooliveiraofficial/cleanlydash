import React, { useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import {
    DollarSign,
    X,
    Send,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

interface QuickPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerEmail?: string;
    customerName?: string;
    onSuccess: (url: string) => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
    isOpen,
    onClose,
    customerEmail = '',
    customerName = '',
    onSuccess
}) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-payment-request', {
                body: {
                    amount: parseFloat(amount),
                    description: description,
                    customer_email: customerEmail,
                    customer_name: customerName
                }
            });

            if (error || data.error) throw new Error(error?.message || data.error);

            toast.success("Link de pagamento gerado com sucesso!");
            onSuccess(data.url);
            onClose();
        } catch (err: any) {
            console.error("Payment Link Error:", err);
            toast.error(err.message || "Erro ao gerar cobrança.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/30">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                            <DollarSign size={20} />
                        </div>
                        <h3 className="font-black text-slate-900">Solicitar Pagamento</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleGenerate} className="p-8 space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Dê um valor ao serviço</label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</div>
                            <input
                                type="number"
                                step="0.01"
                                required
                                autoFocus
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full h-16 bg-slate-50 border-none rounded-2xl pl-10 pr-4 text-2xl font-black text-slate-900 focus:ring-2 ring-indigo-500 transition-all placeholder:text-slate-200"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Motivo da cobrança</label>
                        <textarea
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Ex: Taxa de limpeza extra ou serviço adicional..."
                            className="w-full h-24 bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all placeholder:text-slate-200 resize-none text-sm"
                        />
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3 border border-slate-100">
                        <div className="h-8 w-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-500">
                            {customerName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-none mb-1">Para</p>
                            <p className="text-xs font-bold text-slate-800 truncate">{customerName || 'Cliente'}</p>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || !amount}
                        className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                Gerar e Enviar Link <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
};
