import React, { useState, useEffect } from 'react';
import { createClient } from '../../lib/supabase/client';
import {
    Plus,
    Send,
    Link as LinkIcon,
    CheckCircle2,
    Clock,
    XCircle,
    Search,
    Copy,
    ExternalLink,
    Loader2,
    DollarSign
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';

export const PaymentLinkManager: React.FC = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newInvoice, setNewInvoice] = useState({
        amount: '',
        description: '',
        customer_email: '',
        customer_name: ''
    });
    const supabase = createClient();

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tenant_invoices')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvoices(data || []);
        } catch (err) {
            console.error("Error fetching invoices:", err);
            toast.error("Erro ao carregar faturas.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-payment-request', {
                body: {
                    amount: parseFloat(newInvoice.amount),
                    description: newInvoice.description,
                    customer_email: newInvoice.customer_email,
                    customer_name: newInvoice.customer_name
                }
            });

            if (error || data.error) throw new Error(error?.message || data.error);

            toast.success("Link de pagamento gerado!");
            setNewInvoice({ amount: '', description: '', customer_email: '', customer_name: '' });
            fetchInvoices();

            // Optionally open the link or show it
            if (data.url) {
                // For now just copy to clipboard
                navigator.clipboard.writeText(data.url);
                toast.info("Link copiado para a área de transferência.");
            }
        } catch (err: any) {
            toast.error(err.message || "Erro ao gerar link.");
        } finally {
            setIsCreating(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid': return <CheckCircle2 className="text-emerald-500" size={16} />;
            case 'open': return <Clock className="text-amber-500" size={16} />;
            case 'void': return <XCircle className="text-slate-400" size={16} />;
            default: return <Clock className="text-slate-400" size={16} />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <DollarSign size={24} className="text-indigo-600" />
                    Gestão de Faturas
                </h2>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                    <Plus size={18} className="mr-2" /> Nova Cobrança
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Create Form */}
                <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl h-fit">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                        <LinkIcon size={18} className="text-indigo-500" /> Gerar Link Rápido
                    </h3>
                    <form onSubmit={handleCreateLink} className="space-y-4">
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Valor ($)</label>
                            <input
                                type="number" step="0.01" required
                                value={newInvoice.amount}
                                onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                                placeholder="0.00"
                                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Descrição</label>
                            <input
                                type="text" required
                                value={newInvoice.description}
                                onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
                                placeholder="Ex: Diárias extras / Taxa de Limpeza"
                                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">E-mail do Cliente</label>
                            <input
                                type="email"
                                value={newInvoice.customer_email}
                                onChange={e => setNewInvoice({ ...newInvoice, customer_email: e.target.value })}
                                placeholder="cliente@email.com"
                                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={isCreating}
                            className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-lg shadow-slate-200"
                        >
                            {isCreating ? <Loader2 className="animate-spin" /> : "Gerar Link de Pagamento"}
                        </Button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-black text-slate-800">Histórico de Cobranças</h3>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" placeholder="Buscar..." className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">Data</th>
                                    <th className="px-6 py-4">Cliente / Descrição</th>
                                    <th className="px-6 py-4 text-right">Valor</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td>
                                    </tr>
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center text-slate-400 italic font-medium">Nenhuma fatura encontrada.</td>
                                    </tr>
                                ) : invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                            {new Date(inv.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{inv.description}</div>
                                            <div className="text-xs text-slate-500 font-medium">{inv.customer_email || 'Sem e-mail'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-slate-900">${inv.amount.toFixed(2)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-tight">
                                                {getStatusIcon(inv.status)}
                                                <span className={inv.status === 'paid' ? 'text-emerald-600' : 'text-slate-500'}>
                                                    {inv.status === 'paid' ? 'Pago' : inv.status === 'open' ? 'Pendente' : inv.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors" title="Copiar Link">
                                                    <Copy size={16} />
                                                </button>
                                                <button className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors" title="Ver Detalhes">
                                                    <ExternalLink size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
