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
    DollarSign,
    Mail,
    Trash2,
    Ban
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { ConnectStripeButton } from '../platform/finance/ConnectStripeButton';
import { AlertCircle } from 'lucide-react';

export const PaymentLinkManager: React.FC = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newInvoice, setNewInvoice] = useState({
        amount: '',
        description: '',
        customer_email: '',
        customer_name: '',
        service_id: ''
    });
    const [services, setServices] = useState<any[]>([]);
    const [serviceSearch, setServiceSearch] = useState('');
    const [isServiceOpen, setIsServiceOpen] = useState(false);
    const [stripeAccount, setStripeAccount] = useState<{ stripe_account_id: string } | null>(null);
    const [checkingStripe, setCheckingStripe] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        fetchInvoices();
        checkStripeConnection();
        fetchServices();
    }, []);

    const fetchServices = async () => {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('id, name, price_default, description')
                .order('name');
            if (data) setServices(data);
        } catch (err) {
            console.error("Error fetching services:", err);
        }
    };

    const checkStripeConnection = async () => {
        setCheckingStripe(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('connected_accounts')
                .select('stripe_account_id')
                .eq('tenant_id', user.id)
                .single();

            if (data) setStripeAccount(data);
        } catch (err) {
            console.error("Error checking stripe:", err);
        } finally {
            setCheckingStripe(false);
        }
    };

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
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("Sessão expirada. Por favor, recarregue a página.");
                setIsCreating(false);
                return;
            }

            // Robust env var retrieval for different environments (Vite/Next)
            const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jjbokilvurxztqiwvxhy.supabase.co';

            const response = await fetch(`${baseUrl}/functions/v1/create-payment-request`, {
                method: 'POST',
                headers: {
                    // Send token in custom header to bypass Supabase Gateway's automatic 'Invalid JWT' check
                    // This is verified manually in the Edge Function
                    'X-Supabase-Auth': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'apikey': anonKey
                },
                body: JSON.stringify({
                    amount: parseFloat(newInvoice.amount),
                    description: newInvoice.description,
                    customer_email: newInvoice.customer_email,
                    customer_name: newInvoice.customer_name,
                    service_id: newInvoice.service_id || null
                })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                console.error("[create-payment-request] Error:", data);
                throw new Error(data.details || data.error || "Erro ao gerar link de pagamento.");
            }

            toast.success("Link de pagamento gerado!");
            setNewInvoice({ amount: '', description: '', customer_email: '', customer_name: '', service_id: '' });
            setServiceSearch('');
            fetchInvoices();

            // Auto-copy link to clipboard
            if (data?.url) {
                navigator.clipboard.writeText(data.url);
                toast.info("Link copiado para a área de transferência.");
            }
        } catch (err: any) {
            console.error("Error creating link:", err);
            toast.error(err.message || "Erro ao gerar link.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleSendEmail = async (invoiceId: string) => {
        const toastId = toast.loading("Enviando e-mail...");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sessão expirada");

            // Robust env var retrieval for different environments (Vite/Next)
            const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jjbokilvurxztqiwvxhy.supabase.co';

            const response = await fetch(`${baseUrl}/functions/v1/send-payment-link`, {
                method: 'POST',
                headers: {
                    'X-Supabase-Auth': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                    'apikey': anonKey
                },
                body: JSON.stringify({ invoice_id: invoiceId })
            });

            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || "Erro ao enviar e-mail.");
            }

            toast.success("E-mail enviado com sucesso!", { id: toastId });
        } catch (err: any) {
            console.error("Error sending email:", err);
            toast.error(err.message || "Falha no envio.", { id: toastId });
        }
    };

    const handleVoidInvoice = async (invoiceId: string) => {
        if (!confirm("Deseja realmente cancelar esta fatura?")) return;
        try {
            const { error } = await (supabase
                .from('tenant_invoices') as any)
                .update({ status: 'void' })
                .eq('id', invoiceId);
            if (error) throw error;
            toast.success("Fatura cancelada.");
            fetchInvoices();
        } catch (err: any) {
            toast.error("Erro ao cancelar: " + err.message);
        }
    };

    const handleDeleteInvoice = async (invoiceId: string) => {
        if (!confirm("Deseja realmente EXCLUIR esta fatura permanentemente?")) return;
        try {
            const { error } = await (supabase
                .from('tenant_invoices') as any)
                .delete()
                .eq('id', invoiceId);
            if (error) throw error;
            toast.success("Fatura excluída.");
            fetchInvoices();
        } catch (err: any) {
            toast.error("Erro ao excluir: " + err.message);
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
                <Button
                    onClick={() => document.getElementById('new-charge-form')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                    <Plus size={18} className="mr-2" /> Nova Cobrança
                </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Create Form */}
                <div id="new-charge-form" className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl h-fit">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                        <LinkIcon size={18} className="text-indigo-500" /> Gerar Link Rápido
                    </h3>
                    <form onSubmit={handleCreateLink} className="space-y-4">
                        <div className="relative">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Serviço (Opcional)</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar serviço..."
                                    className="w-full h-12 bg-slate-50 border-none rounded-xl pl-10 pr-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all text-sm"
                                    value={serviceSearch}
                                    onChange={e => {
                                        setServiceSearch(e.target.value);
                                        setIsServiceOpen(true);
                                    }}
                                    onFocus={() => setIsServiceOpen(true)}
                                />
                                {isServiceOpen && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                        {services
                                            .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                                            .map(service => (
                                                <button
                                                    key={service.id}
                                                    type="button"
                                                    className="w-full px-4 py-3 text-left hover:bg-slate-50 flex justify-between items-center group transition-colors border-b border-slate-50 last:border-0"
                                                    onClick={() => {
                                                        setNewInvoice({
                                                            ...newInvoice,
                                                            service_id: service.id,
                                                            amount: service.price_default?.toString() || '',
                                                            description: service.name
                                                        });
                                                        setServiceSearch(service.name);
                                                        setIsServiceOpen(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">{service.name}</div>
                                                        <div className="text-[10px] text-slate-400 font-black uppercase">R$ {service.price_default}</div>
                                                    </div>
                                                    <Plus size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                                </button>
                                            ))}
                                        {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-center text-xs text-slate-400 italic">Nenhum serviço encontrado</div>
                                        )}
                                    </div>
                                )}
                            </div>
                            {newInvoice.service_id && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewInvoice({ ...newInvoice, service_id: '', amount: '', description: '' });
                                        setServiceSearch('');
                                    }}
                                    className="mt-2 text-[10px] font-black text-indigo-600 uppercase hover:underline"
                                >
                                    Limpar Seleção
                                </button>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Valor (R$)</label>
                            <input
                                type="number" step="0.01" required
                                value={newInvoice.amount}
                                onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value, service_id: '' })}
                                placeholder="0.00"
                                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">Descrição</label>
                            <input
                                type="text" required
                                value={newInvoice.description}
                                onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value, service_id: '' })}
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

                        {!checkingStripe && !stripeAccount && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                                <div className="flex gap-2 text-amber-700">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <p className="text-xs font-bold leading-tight">
                                        Seu Stripe não está conectado. Você não poderá gerar links de pagamento até configurar sua conta.
                                    </p>
                                </div>
                                <ConnectStripeButton onConnect={checkStripeConnection} />
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={isCreating || (!checkingStripe && !stripeAccount)}
                            className="w-full h-14 bg-slate-900 hover:bg-black text-white font-black rounded-2xl shadow-lg shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                            <span className="font-black text-slate-900">R$ {inv.amount.toFixed(2)}</span>
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
                                            <div className="flex items-center gap-1 transition-opacity">
                                                <button
                                                    onClick={() => inv.id && handleSendEmail(inv.id)}
                                                    className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                                    title="Enviar por E-mail"
                                                >
                                                    <Mail size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (inv.id) {
                                                            const url = `${window.location.origin}/invoice/${inv.id}`;
                                                            navigator.clipboard.writeText(url);
                                                            toast.success("Link copiado!");
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                                    title="Copiar Link"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        window.open(`/invoice/${inv.id}`, '_blank');
                                                    }}
                                                    className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                                    title="Ver Detalhes"
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                                <button
                                                    onClick={() => inv.id && handleVoidInvoice(inv.id)}
                                                    className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                                                    title="Cancelar Fatura"
                                                >
                                                    <Ban size={16} />
                                                </button>
                                                <button
                                                    onClick={() => inv.id && handleDeleteInvoice(inv.id)}
                                                    className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                                    title="Excluir Fatura"
                                                >
                                                    <Trash2 size={16} />
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
