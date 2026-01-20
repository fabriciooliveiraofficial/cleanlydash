// ARQUIVO: app/(dashboard)/dashboard/page.tsx
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getDashboardAnalytics } from './actions'
import { StatCard } from '@/components/dashboard/stat-card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { RecentSales } from '@/components/dashboard/recent-sales'
import { 
  DollarSign, 
  Users, 
  ClipboardCheck, 
  Ticket, 
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user?.id)
    .single()

  const data = await getDashboardAnalytics()

  if (!data) return null

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Bom dia"
    if (hour < 18) return "Boa tarde"
    return "Boa noite"
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            {greeting()}, {profile?.full_name?.split(' ')[0] || 'Usuário'}!
            <Sparkles className="text-amber-400 fill-amber-400 h-6 w-6" />
          </h1>
          <p className="text-slate-500 font-medium">Veja o resumo do desempenho da sua operação.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 h-11 px-6 font-bold rounded-xl">
            <Link href="/dashboard/calendar">
              Gerenciar Agenda
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Faturamento MTD" 
          value={formatCurrency(data.kpis.mtdRevenue)}
          icon={DollarSign}
          description="Receita realizada no mês atual"
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard 
          title="Novos Clientes" 
          value={data.kpis.newCustomers.toString()}
          icon={Users}
          description="Contas criadas este mês"
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatCard 
          title="Jobs Ativos" 
          value={data.kpis.activeJobs.toString()}
          icon={ClipboardCheck}
          description="Turnovers em andamento ou agendados"
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard 
          title="Ticket Médio" 
          value={formatCurrency(data.kpis.averageTicket)}
          icon={Ticket}
          description="Valor médio por serviço"
          color="text-blue-600"
          bg="bg-blue-50"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        {/* Main Chart Column */}
        <div className="lg:col-span-4">
          <RevenueChart data={data.revenueHistory} />
        </div>

        {/* Right Column: Recent Sales */}
        <div className="lg:col-span-3">
          <RecentSales sales={data.recentSales} />
        </div>
      </div>
    </div>
  )
}
