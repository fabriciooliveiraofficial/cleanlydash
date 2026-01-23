import React, { useState, useEffect } from 'react';
import { FileText, Download, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { createClient } from '../../lib/supabase/client';

interface Invoice {
    id: string;
    number: string;
    status: string;
    amount_due: number;
    amount_paid: number;
    currency: string;
    created: number;
    period_start: number;
    period_end: number;
    hosted_invoice_url: string;
    invoice_pdf: string;
    description: string;
}

export const InvoiceHistory: React.FC = () => {
    const supabase = createClient();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Not authenticated');

            const { data, error } = await supabase.functions.invoke('stripe-invoices', {
                body: { action: 'list', limit: 10 },
                headers: { Authorization: `Bearer ${token}` }
            });

            if (error) throw error;
            setInvoices(data?.invoices || []);
        } catch (err: any) {
            console.error('Error fetching invoices:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatAmount = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency.toUpperCase(),
        }).format(amount / 100);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Pago</span>;
            case 'open':
                return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Pendente</span>;
            case 'void':
                return <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">Cancelado</span>;
            case 'uncollectible':
                return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Não Cobrável</span>;
            default:
                return <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-medium rounded-full">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-3xl border border-slate-200">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <FileText size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">Histórico de Faturas</h3>
                    <p className="text-xs text-slate-500">Suas cobranças anteriores</p>
                </div>
            </div>

            {invoices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                    <FileText size={40} className="mx-auto mb-3 opacity-30" />
                    <p>Nenhuma fatura encontrada</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Data</th>
                                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Descrição</th>
                                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Valor</th>
                                <th className="text-left py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Status</th>
                                <th className="text-right py-3 px-2 text-xs font-medium text-slate-500 uppercase tracking-wide">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-2">
                                        <span className="text-sm text-slate-700">{formatDate(invoice.created)}</span>
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className="text-sm text-slate-700 truncate max-w-[200px] block">
                                            {invoice.description || `Fatura #${invoice.number}`}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className="text-sm font-medium text-slate-900">
                                            {formatAmount(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2">
                                        {getStatusBadge(invoice.status)}
                                    </td>
                                    <td className="py-3 px-2 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {invoice.invoice_pdf && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                >
                                                    <a href={invoice.invoice_pdf} target="_blank" rel="noopener noreferrer">
                                                        <Download size={14} />
                                                    </a>
                                                </Button>
                                            )}
                                            {invoice.hosted_invoice_url && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    asChild
                                                    className="text-slate-500 hover:text-slate-700"
                                                >
                                                    <a href={invoice.hosted_invoice_url} target="_blank" rel="noopener noreferrer">
                                                        <ExternalLink size={14} />
                                                    </a>
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
