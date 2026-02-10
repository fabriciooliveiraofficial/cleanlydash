import React, { useEffect, useState } from 'react';
import { CreditCard, Download, ExternalLink, Receipt, Loader2, FileX } from 'lucide-react';
import { Button } from '../../../ui/button';
import { createClient } from '../../../../lib/supabase/client';
import { format, parseISO } from 'date-fns';

export const BillingTab: React.FC<{ customerId: string }> = ({ customerId }) => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function loadInvoices() {
            setLoading(true);
            const { data } = await supabase
                .from('invoices')
                .select('*')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false });

            if (data) setInvoices(data);
            setLoading(false);
        }
        loadInvoices();
    }, [customerId]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[300px]">
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-widest">Histórico de Faturas</h3>
                        {invoices.length > 0 && (
                            <Button variant="outline" size="sm" className="rounded-xl h-8 px-3 text-[10px] font-black uppercase tracking-widest">
                                Exportar PDF
                            </Button>
                        )}
                    </div>
                    {loading ? (
                        <div className="flex items-center justify-center h-[200px]">
                            <Loader2 className="animate-spin text-indigo-600" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[200px] text-slate-400">
                            <FileX size={40} className="mb-4 text-slate-100" />
                            <p className="text-sm font-medium">Nenhuma fatura encontrada.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-slate-50">
                                {invoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-all">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900">{inv.invoice_number || `INV-${inv.id.slice(0, 8)}`}</p>
                                            <p className="text-[10px] text-slate-400">{format(parseISO(inv.created_at), 'MMM dd, yyyy')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-900">${(Number(inv.amount_total) || 0).toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Download size={16} /></button>
                                                <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><ExternalLink size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white text-center opacity-50">
                    <CreditCard size={32} className="mx-auto mb-4 text-slate-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Método de Pagamento</p>
                    <p className="text-xs font-bold text-slate-400">Sincronizado via Stripe</p>
                    <div className="mt-6 flex justify-center">
                        <Button disabled className="h-8 rounded-xl bg-white/10 text-[10px] uppercase font-black tracking-widest transition-all">
                            Gerenciar no Stripe
                        </Button>
                    </div>
                </div>

                <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                        <Receipt size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black text-indigo-900 uppercase tracking-widest">Cobrança Automática</p>
                        <p className="text-[10px] text-indigo-600 font-medium">Configurado p/ cada serviço</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
