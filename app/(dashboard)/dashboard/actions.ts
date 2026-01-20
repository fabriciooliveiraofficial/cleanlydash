// ARQUIVO: app/(dashboard)/dashboard/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { startOfMonth, endOfMonth, subMonths, format, startOfToday, endOfToday } from 'date-fns'

export async function getDashboardAnalytics() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()

  // 1. Métricas de Resumo
  const { data: mtdBookings } = await supabase
    .from('bookings')
    .select('price, status')
    .gte('start_time', monthStart)
    .lte('start_time', monthEnd)

  const { count: newCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', monthStart)

  const { count: activeJobs } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .in('status', ['pending', 'confirmed', 'in_progress'])

  const completedBookings = mtdBookings?.filter(b => b.status === 'completed') || []
  const mtdRevenue = completedBookings.reduce((acc, curr) => acc + (curr.price || 0), 0)
  const averageTicket = completedBookings.length > 0 ? mtdRevenue / completedBookings.length : 0

  // 2. Histórico de Receita (6 Meses)
  const revenueHistory = []
  for (let i = 5; i >= 0; i--) {
    const date = subMonths(now, i)
    const start = startOfMonth(date).toISOString()
    const end = endOfMonth(date).toISOString()

    const { data: monthData } = await supabase
      .from('bookings')
      .select('price')
      .eq('status', 'completed')
      .gte('start_time', start)
      .lte('start_time', end)

    revenueHistory.push({
      name: format(date, 'MMM'),
      total: monthData?.reduce((acc, curr) => acc + (curr.price || 0), 0) || 0
    })
  }

  // 3. Vendas Recentes (Últimos 5 concluídos)
  const { data: recentSales } = await supabase
    .from('bookings')
    .select('*, customers(name, email)')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    kpis: {
      mtdRevenue,
      newCustomers: newCustomers || 0,
      activeJobs: activeJobs || 0,
      averageTicket
    },
    revenueHistory,
    recentSales: recentSales || []
  }
}
