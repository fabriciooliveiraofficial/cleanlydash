// ARQUIVO: app/(dashboard)/payroll/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function previewPayroll(startDate: string, endDate: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Perfil não encontrado" }

  // 1. Buscar bookings finalizados no período que não estão em payrolls pagos
  // Nota: Simplificação - buscamos todos os completed no range.
  const { data: bookings, error: bError } = await supabase
    .from('bookings')
    .select('*, customers(name)')
    .eq('tenant_id', profile.tenant_id)
    .eq('status', 'completed')
    .gte('start_time', startDate)
    .lte('start_time', endDate)

  if (bError) return { error: "Erro ao buscar agendamentos: " + bError.message }
  if (!bookings || bookings.length === 0) return { data: [], total: 0 }

  // 2. Buscar equipe do tenant
  const { data: team, error: tError } = await supabase
    .from('profiles')
    .select('id, full_name, pay_rate_type, pay_rate_value')
    .eq('tenant_id', profile.tenant_id)

  if (tError) return { error: "Erro ao buscar equipe: " + tError.message }

  const report: Record<string, any> = {}
  let globalTotal = 0

  // 3. Lógica de Cálculo
  bookings.forEach(booking => {
    const cleaners = booking.resource_ids || []
    if (cleaners.length === 0) return

    cleaners.forEach(cleanerId => {
      const member = team.find(m => m.id === cleanerId)
      if (!member) return

      let amountDue = 0
      let method = ""
      const rate = member.pay_rate_value || 0

      if (member.pay_rate_type === 'percentage_revenue') {
        // Regra de Split Justo: Divide o valor bruto pela quantidade de pessoas
        const share = booking.price / cleaners.length
        amountDue = share * (rate / 100)
        method = `${rate}% de R$ ${share.toFixed(2)} (Split entre ${cleaners.length})`
      } else if (member.pay_rate_type === 'flat_rate') {
        amountDue = rate
        method = `Valor Fixo por Job: R$ ${rate.toFixed(2)}`
      } else if (member.pay_rate_type === 'hourly') {
        // Assume 2h se end_time for null
        const start = new Date(booking.start_time)
        const end = booking.end_time ? new Date(booking.end_time) : new Date(start.getTime() + 2 * 60 * 60 * 1000)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        amountDue = hours * rate
        method = `${hours.toFixed(1)}h x R$ ${rate.toFixed(2)}/h`
      }

      if (!report[cleanerId]) {
        report[cleanerId] = {
          profile: member,
          total: 0,
          items: []
        }
      }

      report[cleanerId].total += amountDue
      report[cleanerId].items.push({
        booking_id: booking.id,
        property: booking.property_name,
        date: booking.start_time,
        amount: amountDue,
        description: method
      })
      globalTotal += amountDue
    })
  })

  return { 
    data: Object.values(report), 
    total: globalTotal,
    period: { start: startDate, end: endDate }
  }
}

export async function createPayrollRun(data: {
  period_start: string;
  period_end: string;
  total_payout: number;
  items: any[]; // Agrupado por funcionário
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Perfil não encontrado" }

  // 1. Criar Master Payroll
  const { data: payroll, error: pError } = await supabase
    .from('payrolls')
    .insert({
      tenant_id: profile.tenant_id,
      period_start: data.period_start,
      period_end: data.period_end,
      total_payout: data.total_payout,
      status: 'draft'
    })
    .select()
    .single()

  if (pError || !payroll) return { error: "Falha ao criar cabeçalho da folha." }

  // 2. Criar Itens Detalhados
  const flatItems: any[] = []
  data.items.forEach((emp: any) => {
    emp.items.forEach((it: any) => {
      flatItems.push({
        payroll_id: payroll.id,
        profile_id: emp.profile.id,
        booking_id: it.booking_id,
        item_type: 'commission',
        amount: it.amount,
        description: it.description
      })
    })
  })

  const { error: iError } = await supabase.from('payroll_items').insert(flatItems)
  if (iError) return { error: "Falha ao salvar detalhes da folha." }

  revalidatePath('/dashboard/payroll')
  return { success: true, id: payroll.id }
}

export async function approvePayroll(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('payrolls')
    .update({ status: 'approved' })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/payroll')
  return { success: true }
}
