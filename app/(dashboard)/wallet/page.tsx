// ARQUIVO: app/(dashboard)/wallet/page.tsx
import { getWalletStats, getTransactions } from './actions'
import { 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  Download,
  DollarSign,
  TrendingUp,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AddFundsDialog } from './add-funds-dialog'

export default async function WalletPage() {
  const stats = await getWalletStats()
  const transactions = await getTransactions()

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financeiro & Wallet</h2>
          <p className="text-slate-500 text-sm">Gerencie seu saldo e acompanhe o fluxo de caixa.</p>
        </div>
        <AddFundsDialog />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Balance Card */}
        <Card className="lg:col-span-2 overflow-hidden border-none bg-indigo-950 text-white shadow-2xl relative">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>
          <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-300" />
              <CardTitle className="text-sm font-medium text-indigo-200 uppercase tracking-wider">Saldo Disponível</CardTitle>
            </div>
            <TrendingUp className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent className="relative z-10 pt-4">
            <div className="text-5xl font-black tracking-tight mb-8">
              {'error' in stats ? 'R$ 0,00' : formatCurrency(stats.balance)}
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-indigo-400">Total de Entradas</span>
                <span className="text-emerald-400 font-bold">{'error' in stats ? '-' : formatCurrency(stats.income)}</span>
              </div>
              <div className="h-8 w-px bg-indigo-800"></div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-indigo-400">Total de Saídas</span>
                <span className="text-rose-400 font-bold">{'error' in stats ? '-' : formatCurrency(stats.expenses)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Summary */}
        <Card className="shadow-lg border-slate-100">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600" />
              Resumo Operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Limpezas Concluídas</span>
                <span className="font-bold text-slate-900">0</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Taxas Administrativas</span>
                <span className="font-bold text-rose-600">R$ 0,00</span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Próximo Payout</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-700">Terça, 20 Out</span>
                <span className="text-indigo-600 font-black">R$ 0,00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card className="shadow-xl border-slate-100">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-lg font-bold text-slate-900">Extrato de Transações</CardTitle>
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} />
            Exportar CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full",
                      tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {tx.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-none">{tx.description || "Transação"}</p>
                      <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-tighter">
                        {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} • {tx.service_type}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "font-bold text-lg",
                    tx.amount > 0 ? "text-emerald-600" : "text-slate-900"
                  )}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center">
                <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                  <History size={24} />
                </div>
                <p className="text-slate-400 text-sm font-medium">Nenhuma transação encontrada.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}