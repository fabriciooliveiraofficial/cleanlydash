import React, { useEffect, useState } from 'react';
import {
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Loader2,
  History,
  Sparkles
} from 'lucide-react';
import { createClient } from '../lib/supabase/client.ts';
import { AddFundsDialog } from './wallet/add-funds-dialog.tsx';
import { Card } from './ui/card.tsx';


export const Wallet: React.FC = () => {
  const [ledger, setLedger] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function fetchWallet() {
    const { data } = await supabase.from('wallet_ledger').select('*').order('created_at', { ascending: false });
    const currentBalance = data?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
    setLedger(data || []);
    setBalance(currentBalance);
    setLoading(false);
  }

  useEffect(() => {
    fetchWallet();
  }, []);

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Balance Card */}
        <div className="lg:col-span-2 rounded-[2.5rem] bg-indigo-950 p-10 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-10 text-indigo-300">
              <Sparkles size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Saldo de Tokens</span>
            </div>
            <h2 className="text-6xl font-black tracking-tighter mb-10 flex items-baseline gap-2">
              {balance} <span className="text-2xl font-bold text-indigo-400">Tokens</span>
            </h2>
            <div className="flex gap-4">
              <AddFundsDialog onSuccess={fetchWallet} />
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <Card className="rounded-[2.5rem] border-slate-100 shadow-xl p-8 flex flex-col justify-between">
          <div className="space-y-6">
            <h3 className="font-black text-slate-900 flex items-center gap-2"><DollarSign size={18} className="text-indigo-600" /> Valor Estimado</h3>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Poder de Compra</div>
              <div className="text-2xl font-black text-slate-900">
                ≈ ${(balance * 0.10).toFixed(2)}
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              1 Token = $0.10 em serviços de IA (Roteirização, Visão, Voz).
            </p>
          </div>
        </Card>


      </div>

      {/* Transaction History */}
      <div className="rounded-[2.5rem] border bg-white shadow-sm overflow-hidden">
        <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><History size={20} className="text-slate-400" /> Histórico de Transações</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {ledger.length > 0 ? ledger.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-6 hover:bg-slate-50/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${tx.amount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                  {tx.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div>
                  <p className="font-bold text-slate-900">{tx.description || 'Transação'}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              <div className={`text-lg font-black ${tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                {tx.amount > 0 ? '+' : ''} {Math.abs(tx.amount)} Tokens
              </div>
            </div>
          )) : (
            <div className="p-20 text-center text-slate-400 italic">Nenhuma transação registrada.</div>
          )}
        </div>
      </div>
    </div>
  );
};
