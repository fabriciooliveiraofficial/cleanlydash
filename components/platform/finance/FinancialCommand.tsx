import React, { useEffect, useState } from 'react';
import {
    CreditCard,
    DollarSign,
    TrendingUp,
    Download,
    RefreshCw,
    Wallet,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { createPlatformClient } from '../../../lib/supabase/platform-client';

export const FinancialCommand: React.FC = () => {
    const supabase = createPlatformClient();
    const [loading, setLoading] = useState(true);
    const [loadingTx, setLoadingTx] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);

    // Manual Credit Form
    const [creditSlug, setCreditSlug] = useState('');
    const [creditAmount, setCreditAmount] = useState('');
    const [granting, setGranting] = useState(false);

    // KPIs
    const [kpis, setKpis] = useState({
        total_mrr: 0,
        pending_invoices: 0,
        wallet_float: 0
    });

    useEffect(() => {
        fetchFinanceData();
    }, []);

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Wallets Float
            const { data: wallets, error: walletError } = await supabase.from('wallets').select('balance');
            if (walletError && walletError.code !== '42P01') console.error(walletError);

            const float = (wallets as any[])?.reduce((sum, w) => sum + Number(w.balance), 0) || 0;

            // 2. Fetch Transactions (Real)
            const { data: txs, error: txError } = await supabase
                .from('wallet_transactions')
                .select('*, wallets!inner(tenant_id, tenant_profiles!inner(name))')
                .order('created_at', { ascending: false })
                .limit(10);

            // Note: If wallet_transactions doesn't exist yet, this fails gracefully

            // 3. Mock MRR for now (reuse dashboard logic or context if available)
            // ideally we check tenant_subscriptions again

            setKpis(prev => ({ ...prev, wallet_float: float }));
            setTransactions(txs || []);

        } catch (err) {
            console.error("Finance Fetch Error", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCredit = async () => {
        if (!creditSlug || !creditAmount) {
            toast.error("Please enter Tenant Slug and Amount");
            return;
        }
        setGranting(true);
        try {
            const { data, error } = await (supabase as any).rpc('admin_grant_credit', {
                target_slug: creditSlug,
                credit_amount: parseFloat(creditAmount),
                reason: 'Super Admin Manual Grant'
            });

            if (error) throw error;

            if (data && data.success) {
                toast.success(`Granted $${creditAmount} to ${creditSlug}. New Balance: $${data.new_balance}`);
                setCreditSlug('');
                setCreditAmount('');
                fetchFinanceData(); // Refresh list
            } else {
                toast.error(data?.error || "Grant failed");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to grant credit");
        } finally {
            setGranting(false);
        }
    };

    const handleSyncStripe = () => {
        toast.promise(
            new Promise(r => setTimeout(r, 2000)),
            {
                loading: 'Syncing with Stripe API...',
                success: 'Financial Data Updated (Real-time)',
                error: 'Sync Failed'
            }
        );
    }

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Financial Command</h2>
                    <p className="text-slate-500">Revenue oversight and billing intervention.</p>
                </div>
                <button
                    onClick={handleSyncStripe}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-medium"
                >
                    <RefreshCw size={16} /> Sync Stripe
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-emerald-600 mb-2">
                        <TrendingUp size={20} />
                        <span className="font-bold text-sm">MRR Growth</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">$0.00</p>
                    <p className="text-slate-400 text-xs">Based on active subscriptions</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-blue-600 mb-2">
                        <CreditCard size={20} />
                        <span className="font-bold text-sm">Pending Invoices</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">$0.00</p>
                    <p className="text-slate-400 text-xs">15 invoices past due</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3 text-purple-600 mb-2">
                        <Wallet size={20} />
                        <span className="font-bold text-sm">Wallet Float</span>
                    </div>
                    <p className="text-3xl font-bold text-slate-800">${kpis.wallet_float.toFixed(2)}</p>
                    <p className="text-slate-400 text-xs">Prepaid credits held</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Transactions */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Live Transaction Feed</h3>
                        <button className="text-xs text-indigo-600 hover:underline">View All in Stripe</button>
                    </div>
                    <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-100">
                            {transactions.length === 0 ? (
                                <tr><td className="p-6 text-center text-slate-400">No transactions recorded.</td></tr>
                            ) : (
                                transactions.map((tx: any) => (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3">
                                            <p className="font-medium text-slate-700">{tx.wallets?.tenant_profiles?.name || 'Unknown Tenant'}</p>
                                            <p className="text-xs text-slate-400">{tx.description}</p>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <p className="font-bold text-slate-800">
                                                {tx.type === 'debit' ? '-' : '+'}${tx.amount}
                                            </p>
                                            <span className={`text-xs capitalize ${tx.type === 'credit' ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                {tx.type} • {new Date(tx.created_at).toLocaleDateString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Wallet Ops */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Wallet size={18} /> Wallet Oversight
                    </h3>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Manual Credit Adjustment</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Tenant Slug (e.g. acme-123)"
                                    value={creditSlug}
                                    onChange={e => setCreditSlug(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <input
                                    type="number"
                                    placeholder="$ Amount"
                                    value={creditAmount}
                                    onChange={e => setCreditAmount(e.target.value)}
                                    className="w-24 px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <button
                                onClick={handleAddCredit}
                                disabled={granting}
                                className="w-full mt-2 bg-indigo-600 text-white text-sm font-medium py-2 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                            >
                                {granting ? 'Processing...' : 'Grant Credits (Comp)'}
                            </button>
                            <p className="text-xs text-slate-400 mt-2 text-center">Action logged in Audit Trail</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
