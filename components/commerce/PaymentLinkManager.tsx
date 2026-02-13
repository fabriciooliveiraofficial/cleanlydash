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
    Ban,
    FileDown,
    Check
} from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { ConnectStripeButton } from '../platform/finance/ConnectStripeButton';
import { AlertCircle } from 'lucide-react';
import { HybridInvoiceDialog } from '../invoices/HybridInvoiceDialog';
import { generateProfessionalInvoicePDF } from '../../lib/utils/pdf-invoice';

import { useTranslation } from 'react-i18next';

export const PaymentLinkManager: React.FC = () => {
    const { t, i18n } = useTranslation();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
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
            const [manualRes, hybridRes] = await Promise.all([
                supabase
                    .from('tenant_invoices')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('invoices')
                    .select('*, customers(name, email)')
                    .order('created_at', { ascending: false })
            ]);

            if (manualRes.error) throw manualRes.error;
            if (hybridRes.error) throw hybridRes.error;

            const manualInvoices = (manualRes.data || []).map(inv => ({
                ...inv,
                type: 'manual',
            }));

            const hybridInvoices = (hybridRes.data || []).map(inv => ({
                ...inv,
                type: 'hybrid',
                description: inv.description || `${t('finance.invoice_dialog.title')} - ${inv.customers?.name || t('booking_modal.client_label')}`,
                customer_email: inv.customers?.email || '',
                customer_name: inv.customers?.name || ''
            }));

            const unified = [...manualInvoices, ...hybridInvoices].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setInvoices(unified);
        } catch (err) {
            console.error("Error fetching invoices:", err);
            toast.error(t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const search = searchTerm.toLowerCase();
        return (
            inv.description?.toLowerCase().includes(search) ||
            inv.customer_email?.toLowerCase().includes(search) ||
            inv.customer_name?.toLowerCase().includes(search)
        );
    });

    const handleCreateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error(t('auth.loading'));
                setIsCreating(false);
                return;
            }

            const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            const baseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jjbokilvurxztqiwvxhy.supabase.co';

            const response = await fetch(`${baseUrl}/functions/v1/create-payment-request`, {
                method: 'POST',
                headers: {
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
                throw new Error(data.details || data.error || "Error generating payment link");
            }

            toast.success(t('finance.create_form.submit'));
            setNewInvoice({ amount: '', description: '', customer_email: '', customer_name: '', service_id: '' });
            setServiceSearch('');
            fetchInvoices();

            if (data?.url) {
                navigator.clipboard.writeText(data.url);
                toast.info(t('finance.actions.copy_link'));
            }
        } catch (err: any) {
            console.error("Error creating link:", err);
            toast.error(err.message || "Error generating link");
        } finally {
            setIsCreating(false);
        }
    };

    const handleSendEmail = async (invoiceId: string) => {
        const toastId = toast.loading(t('common.loading'));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Session expired");

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
                throw new Error(data.error || "Error sending email");
            }

            toast.success(t('finance.actions.send_email'), { id: toastId });
        } catch (err: any) {
            console.error("Error sending email:", err);
            toast.error(err.message || "Failed to send email", { id: toastId });
        }
    };

    const handleDownloadPDF = async (invoice: any) => {
        try {
            toast.loading(t('common.loading'));

            let items = [];
            if (invoice.type === 'hybrid') {
                const { data: lines } = await supabase
                    .from('invoice_lines')
                    .select('*')
                    .eq('invoice_id', invoice.id);

                items = (lines || []).map(l => ({
                    description: l.description,
                    quantity: l.quantity || 1,
                    price: Number(l.amount),
                    total: Number(l.amount) * (l.quantity || 1)
                }));
            } else {
                items = [{
                    description: invoice.description,
                    quantity: 1,
                    price: Number(invoice.amount),
                    total: Number(invoice.amount)
                }];
            }

            const { data: profile } = await supabase
                .from('tenant_profiles')
                .select('*')
                .eq('id', invoice.tenant_id)
                .maybeSingle();

            generateProfessionalInvoicePDF({
                id: invoice.id,
                number: invoice.id,
                date: new Date(invoice.created_at).toLocaleDateString(i18n.language),
                currency: invoice.currency || 'BRL',
                total: Number(invoice.amount),
                customer: {
                    name: invoice.customer_name || t('booking_modal.client_label'),
                    email: invoice.customer_email || ''
                },
                tenant: {
                    name: profile?.name || 'My Company',
                    email: profile?.email || 'contact@company.com',
                    address: profile?.address || ''
                },
                items,
                labels: {
                    invoice: t('finance.pdf.invoice_title'),
                    billTo: t('finance.pdf.bill_to'),
                    invoiceNumber: t('finance.pdf.invoice_number'),
                    date: t('finance.pdf.date'),
                    dueDate: t('finance.pdf.due_date'),
                    description: t('finance.pdf.description'),
                    qty: t('finance.pdf.qty'),
                    unitPrice: t('finance.pdf.unit_price'),
                    total: t('finance.pdf.total'),
                    thanks: t('finance.pdf.footer_thanks')
                }
            });

            toast.dismiss();
            toast.success(t('finance.actions.download_pdf'));
        } catch (err: any) {
            toast.dismiss();
            toast.error("Error generating PDF: " + err.message);
        }
    };

    const handleVoidInvoice = async (invoice: any) => {
        if (!confirm(t('common.delete') + "?")) return;
        try {
            const table = invoice.type === 'hybrid' ? 'invoices' : 'tenant_invoices';
            const { error } = await (supabase
                .from(table) as any)
                .update({ status: 'void' })
                .eq('id', invoice.id);
            if (error) throw error;
            toast.success(t('finance.status.void'));
            fetchInvoices();
        } catch (err: any) {
            toast.error("Error: " + err.message);
        }
    };

    const handleDeleteInvoice = async (invoice: any) => {
        if (!confirm(t('common.delete') + "?")) return;
        try {
            const table = invoice.type === 'hybrid' ? 'invoices' : 'tenant_invoices';
            const { error } = await (supabase
                .from(table) as any)
                .delete()
                .eq('id', invoice.id);
            if (error) throw error;
            toast.success(t('finance.actions.delete_fatura'));
            fetchInvoices();
        } catch (err: any) {
            toast.error("Error: " + err.message);
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
                    {t('finance.title')}
                </h2>
                <HybridInvoiceDialog onSuccess={fetchInvoices} />
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Create Form */}
                <div id="new-charge-form" className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl h-fit">
                    <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                        <LinkIcon size={18} className="text-indigo-500" /> {t('finance.create_link_title')}
                    </h3>
                    <form onSubmit={handleCreateLink} className="space-y-4">
                        <div className="relative">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">{t('finance.create_form.service_label')}</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={t('finance.create_form.service_placeholder')}
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
                                                        <div className="text-[10px] text-slate-400 font-black uppercase">
                                                            {new Intl.NumberFormat(i18n.language, {
                                                                style: 'currency',
                                                                currency: i18n.language === 'en' ? 'USD' : 'BRL'
                                                            }).format(service.price_default || 0)}
                                                        </div>
                                                    </div>
                                                    <Plus size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                                                </button>
                                            ))}
                                        {services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-center text-xs text-slate-400 italic">{t('finance.invoice_dialog.booking_import_empty')}</div>
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
                                    {t('common.cancel')}
                                </button>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">{t('finance.create_form.amount_label')}</label>
                            <input
                                type="number" step="0.01" required
                                value={newInvoice.amount}
                                onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value, service_id: '' })}
                                placeholder="0.00"
                                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">{t('finance.create_form.description_label')}</label>
                            <input
                                type="text" required
                                value={newInvoice.description}
                                onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value, service_id: '' })}
                                placeholder={t('finance.create_form.description_placeholder')}
                                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 block">{t('finance.create_form.customer_email_label')}</label>
                            <input
                                type="email"
                                value={newInvoice.customer_email}
                                onChange={e => setNewInvoice({ ...newInvoice, customer_email: e.target.value })}
                                placeholder="client@email.com"
                                className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-bold text-slate-900 focus:ring-2 ring-indigo-500 transition-all"
                            />
                        </div>

                        {!checkingStripe && !stripeAccount && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                                <div className="flex gap-2 text-amber-700">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <p className="text-xs font-bold leading-tight">
                                        Your Stripe account is not connected. You won't be able to generate payment links until configured.
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
                            {isCreating ? <Loader2 className="animate-spin" /> : t('finance.create_form.submit')}
                        </Button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                    <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-black text-slate-800">{t('finance.history_title')}</h3>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder={t('finance.search_placeholder')}
                                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:ring-2 ring-indigo-500 transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">{t('finance.table.date')}</th>
                                    <th className="px-6 py-4">{t('finance.table.client_desc')}</th>
                                    <th className="px-6 py-4 text-right">{t('finance.table.amount')}</th>
                                    <th className="px-6 py-4">{t('finance.table.status')}</th>
                                    <th className="px-6 py-4">{t('common.more_options')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></td>
                                    </tr>
                                ) : filteredInvoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-16 text-center text-slate-400 italic font-medium">{t('finance.invoice_dialog.booking_import_empty')}</td>
                                    </tr>
                                ) : filteredInvoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                            {new Date(inv.created_at).toLocaleDateString(i18n.language)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{inv.description}</div>
                                            <div className="text-xs text-slate-500 font-medium">{inv.customer_email || t('booking_modal.client_label')}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-slate-900">
                                                {new Intl.NumberFormat(i18n.language, {
                                                    style: 'currency',
                                                    currency: inv.currency || (i18n.language === 'en' ? 'USD' : 'BRL')
                                                }).format(inv.amount)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-tight">
                                                {getStatusIcon(inv.status)}
                                                <span className={inv.status === 'paid' ? 'text-emerald-600' : 'text-slate-500'}>
                                                    {t(`finance.status.${inv.status}`)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 transition-opacity">
                                                <button
                                                    onClick={() => inv.id && handleSendEmail(inv.id)}
                                                    className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                                    title={t('finance.actions.send_email')}
                                                >
                                                    <Mail size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadPDF(inv)}
                                                    className="p-2 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors"
                                                    title={t('finance.actions.download_pdf')}
                                                >
                                                    <FileDown size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (inv.id) {
                                                            const url = `${window.location.origin}/invoice/${inv.id}`;
                                                            navigator.clipboard.writeText(url);
                                                            toast.success(t('finance.actions.copy_link'));
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors"
                                                    title={t('finance.actions.copy_link')}
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        window.open(`/invoice/${inv.id}`, '_blank');
                                                    }}
                                                    className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors"
                                                    title={t('finance.actions.view_details')}
                                                >
                                                    <ExternalLink size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleVoidInvoice(inv)}
                                                    className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors"
                                                    title={t('finance.actions.cancel_fatura')}
                                                >
                                                    <Ban size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteInvoice(inv)}
                                                    className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                                                    title={t('finance.actions.delete_fatura')}
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
