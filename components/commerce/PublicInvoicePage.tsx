import React, { useEffect, useState } from 'react';
import { CreditCard, DollarSign, FileText, CheckCircle2, MapPin, Calendar, Receipt, ChevronRight, Copy, Check } from 'lucide-react';
import { createClient } from '../../lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { format, parseISO } from 'date-fns';

export const PublicInvoicePage: React.FC = () => {
    const [invoice, setInvoice] = useState<any>(null);
    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const supabase = createClient();

    useEffect(() => {
        const fetchInvoice = async () => {
            const pathParts = window.location.pathname.split('/');
            const id = pathParts[pathParts.length - 1];

            if (!id) {
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('invoices')
                    .select('*, customers(*), bookings(*, services(*))')
                    .eq('id', id)
                    .single();

                const invoiceData = data as any;

                if (error) throw error;
                if (invoiceData) {
                    setInvoice(invoiceData);

                    // Fetch Tenant Info
                    if (invoiceData.tenant_id) {
                        const { data: tenantData } = await supabase
                            .from('tenant_profiles')
                            .select('*')
                            .eq('id', invoiceData.tenant_id)
                            .single();
                        if (tenantData) setTenant(tenantData);
                    }
                }
            } catch (err) {
                console.error("Error fetching invoice:", err);
                toast.error("Fatura não encontrada.");
            } finally {
                setLoading(false);
            }
        };

        fetchInvoice();
    }, []);

    const handleCopy = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleStripePayment = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-payment-request', {
                body: {
                    amount: invoice.amount,
                    currency: 'brl',
                    description: `Fatura INV-${invoice.id.slice(0, 6).toUpperCase()}`,
                    customer_email: invoice.customers?.email,
                    customer_name: invoice.customers?.name
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            console.error(err);
            toast.error("Erro ao iniciar pagamento Stripe: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-center">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-xl max-w-sm">
                    <div className="bg-slate-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText size={40} className="text-slate-400" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">Invoice Not Found</h2>
                    <p className="text-slate-500 mb-6">Either the link is invalid or the invoice expired.</p>
                    <Button onClick={() => window.location.reload()} className="w-full">Try Again</Button>
                </div>
            </div>
        );
    }

    const isPaid = invoice.status === 'paid';

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 md:py-20">
            <div className="max-w-4xl mx-auto grid md:grid-cols-5 gap-8">
                {/* Left Side: Invoice Details */}
                <div className="md:col-span-3 space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden animate-in slide-in-from-left duration-700">
                        {/* Header */}
                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-10 text-white">
                            <div className="flex justify-between items-start mb-10">
                                <div>
                                    <div className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{tenant?.company_name || 'Cleanlydash'}</div>
                                    <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
                                        Fatura <span className="opacity-30">#</span>{invoice.id.slice(0, 6).toUpperCase()}
                                    </h1>
                                </div>
                                {isPaid ? (
                                    <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-6 py-2 rounded-full font-black uppercase tracking-widest text-xs backdrop-blur-md">
                                        Paga
                                    </div>
                                ) : (
                                    <div className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-6 py-2 rounded-full font-black uppercase tracking-widest text-xs backdrop-blur-md">
                                        Em Aberto
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-8 mt-10">
                                <div>
                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Para o Cliente</div>
                                    <div className="font-bold text-lg">{invoice.customers?.name}</div>
                                    <div className="text-sm text-white/60">{invoice.customers?.email}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Data de Emissão</div>
                                    <div className="font-bold text-lg">{format(parseISO(invoice.created_at), 'dd MMM, yyyy')}</div>
                                </div>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="p-10 space-y-10">
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Receipt size={14} /> Detalhes do Serviço
                                </h3>
                                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-14 w-14 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-indigo-600">
                                            <Calendar size={28} />
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-lg">{invoice.bookings?.services?.name || 'Serviço Profissional'}</div>
                                            <div className="text-xs text-slate-500 font-bold flex items-center gap-1.5 mt-1">
                                                <MapPin size={12} /> {invoice.bookings?.customers?.address || 'Property Location'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</div>
                                        <div className="text-2xl font-black text-slate-900">R$ {invoice.amount?.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Proof/Checklist Summary (Mocked UI) */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <CheckCircle2 size={14} /> Resumo da Execução
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        'Ambientes Limpos', 'Fotos de Checklist', 'Inventário Verificado', 'Seguro Ativo'
                                    ].map(item => (
                                        <div key={item} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl">
                                            <div className="h-6 w-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Payment Methods */}
                {!isPaid && (
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-xl p-8 animate-in slide-in-from-right duration-700">
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Pagar Agora</h2>
                            <p className="text-sm text-slate-500 mb-8">Escolha sua forma de pagamento preferida para liquidar esta fatura.</p>

                            <div className="space-y-4">
                                {/* Stripe Button */}
                                {(!invoice.payment_method || invoice.payment_method === 'stripe') && (
                                    <button
                                        onClick={handleStripePayment}
                                        disabled={loading}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-3xl flex items-center justify-between group transition-all shadow-xl shadow-indigo-100"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <CreditCard size={24} />
                                            </div>
                                            <div className="text-left font-black tracking-tight text-lg">Cartão de Crédito</div>
                                        </div>
                                        <ChevronRight size={24} className="opacity-40" />
                                    </button>
                                )}

                                {/* Manual Methods */}
                                {(tenant?.zelle_email || tenant?.venmo_user || tenant?.check_payable_to) && (
                                    <div className="pt-6 space-y-4 border-t border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Transferência Manual</h4>

                                        {tenant.zelle_email && (
                                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 group">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center font-black italic">Z</div>
                                                        <span className="font-black text-slate-800">Zelle</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopy(tenant.zelle_email, 'zelle')}
                                                        className="text-indigo-600 hover:bg-white p-2 rounded-xl transition-all"
                                                    >
                                                        {copied === 'zelle' ? <Check size={18} /> : <Copy size={18} />}
                                                    </button>
                                                </div>
                                                <div className="text-sm font-bold text-slate-500 break-all">{tenant.zelle_email}</div>
                                            </div>
                                        )}

                                        {tenant.venmo_user && (
                                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 group">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-black">V</div>
                                                        <span className="font-black text-slate-800">Venmo</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopy(tenant.venmo_user, 'venmo')}
                                                        className="text-indigo-600 hover:bg-white p-2 rounded-xl transition-all"
                                                    >
                                                        {copied === 'venmo' ? <Check size={18} /> : <Copy size={18} />}
                                                    </button>
                                                </div>
                                                <div className="text-sm font-bold text-slate-500 break-all">@{tenant.venmo_user}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Customer Support Info */}
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-6 text-center">
                            <p className="text-xs text-indigo-700/70 font-medium italic">
                                "Obrigado por utilizar nossos serviços profissionais. <br />Dúvidas? Entre em contato pelo nosso atendimento."
                            </p>
                        </div>
                    </div>
                )}

                {isPaid && (
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-[2.5rem] shadow-xl p-10 text-center animate-in zoom-in duration-500">
                            <div className="h-24 w-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-100 mx-auto mb-8">
                                <CheckCircle2 size={48} strokeWidth={3} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-800 mb-2">Fatura Quitada</h2>
                            <p className="text-slate-500 font-medium mb-10">Obrigado! O pagamento foi processado com sucesso.</p>

                            <Button className="w-full h-14 bg-slate-900 border-none rounded-2xl font-bold tracking-tight shadow-lg" onClick={() => window.print()}>
                                Baixar Comprovante
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            <Toaster position="top-right" richColors />
        </div>
    );
};

// Mock Toaster if not available or just use from sonner
import { Toaster } from 'sonner';
