// ARQUIVO: components/analytics/stats-cards.tsx
import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { 
  TrendingUp, 
  CheckCircle2, 
  Users, 
  Ticket,
  ArrowUpRight
} from 'lucide-react'

interface StatsCardsProps {
  metrics: {
    predictedRevenue: number;
    realizedRevenue: number;
    newCustomers: number;
    averageTicket: number;
  }
}

export function StatsCards({ metrics }: StatsCardsProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const items = [
    {
      label: 'Receita Prevista',
      value: formatCurrency(metrics.predictedRevenue),
      description: 'Bookings confirmados este mês',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Receita Realizada',
      value: formatCurrency(metrics.realizedRevenue),
      description: 'Serviços concluídos e faturados',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50'
    },
    {
      label: 'Novos Clientes',
      value: metrics.newCustomers.toString(),
      description: 'Contas criadas no período',
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(metrics.averageTicket),
      description: 'Valor médio por limpeza',
      icon: Ticket,
      color: 'text-amber-600',
      bg: 'bg-amber-50'
    }
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <Card key={i} className="border-none shadow-sm overflow-hidden group">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${item.bg} ${item.color}`}>
                <item.icon size={20} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <ArrowUpRight size={12} />
                CRESCENTE
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{item.label}</p>
              <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                {item.value}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium italic">{item.description}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
