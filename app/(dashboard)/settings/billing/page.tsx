// ARQUIVO: app/(dashboard)/settings/billing/page.tsx
import { getWalletStats, getTransactions } from '../../wallet/actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Wallet, ArrowRight, Zap, History } from 'lucide-react'
import { AddFundsDialog } from '../../wallet/add-funds-dialog'

export default async function BillingPage() {
  const stats = await getWalletStats()
  const transactions = await getTransactions()

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-indigo-600 text-white shadow-lg overflow-hidden relative">
          <div className="absolute right-0 bottom-0 opacity-10">
            <Wallet size={120} />
          </div>
          <CardHeader>
            <CardTitle className="text-indigo-100 text-sm font-medium uppercase tracking-widest">Saldo da Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            <div className="text-4xl font-black tracking-tight">
              {'error' in stats ? 'R$ 0,00' : formatCurrency(stats.balance)}
            </div>
            <div className="flex gap-2">
              <AddFundsDialog />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap size={18} className="text-amber-500 fill-amber-500" />
              Plano AirGoverness
            </CardTitle>
            <CardDescription>Você está no plano gratuito (Trial).</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 mb-4">Atualize para o plano Profissional para liberar turnovers ilimitados e relatórios avançados.</p>
            <Button variant="outline" className="w-full gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              Ver Planos Profissionais
              <ArrowRight size={14} />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <History size={18} className="text-slate-400" />
              Últimas Atividades Financeiras
            </CardTitle>
            <CardDescription>Histórico de créditos e débitos da conta.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-indigo-600">Ver Extrato Completo</Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-slate-50/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    tx.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  }`}>
                    {tx.amount > 0 ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-none">{tx.description || "Transação"}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">
                      {new Date(tx.created_at).toLocaleDateString('pt-BR')} • {tx.service_type}
                    </p>
                  </div>
                </div>
                <div className={cn("text-sm font-bold", tx.amount > 0 ? "text-emerald-600" : "text-slate-900")}>
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ')
}
