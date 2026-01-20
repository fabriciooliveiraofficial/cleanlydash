
// ARQUIVO: app/(dashboard)/invoices/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { addDays } from 'date-fns'

/**
 * Gera uma fatura baseada em um serviço finalizado.
 */
export async function createInvoiceFromBooking(bookingId: string, customDueDate?: string) {
  const supabase = createClient()
  
  const { data: booking, error: bError } = await supabase
    .from('bookings')
    .select('*, customers(id, name)')
    .eq('id', bookingId)
    .single()

  if (bError || !booking) return { error: "Agendamento não encontrado." }

  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('booking_id', bookingId)
    .single()

  if (existing) return { error: "Este agendamento já possui uma fatura gerada." }

  const dueDate = customDueDate || addDays(new Date(), 7).toISOString().split('T')[0]

  const { data: invoice, error: iError } = await supabase
    .from('invoices')
    .insert({
      tenant_id: booking.tenant_id,
      customer_id: booking.customer_id,
      booking_id: booking.id,
      amount: booking.price,
      status: 'draft',
      due_date: dueDate,
      issued_date: new Date().toISOString().split('T')[0]
    })
    .select()
    .single()

  if (iError) return { error: "Erro ao criar fatura: " + iError.message }

  revalidatePath('/dashboard/invoices')
  return { success: true, invoiceId: invoice.id }
}

/**
 * Marca uma fatura como paga e lança o crédito na Wallet.
 */
export async function markInvoiceAsPaid(invoiceId: string) {
  const supabase = createClient()

  const { data: invoice, error: iError } = await supabase
    .from('invoices')
    .select('*, customers(name)')
    .eq('id', invoiceId)
    .single()

  if (iError || !invoice) return { error: "Fatura não encontrada." }
  if (invoice.status === 'paid') return { error: "Fatura já está paga." }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({ status: 'paid' })
    .eq('id', invoiceId)

  if (updateError) return { error: "Erro ao atualizar fatura: " + updateError.message }

  const { error: walletError } = await supabase
    .from('wallet_ledger')
    .insert({
      tenant_id: invoice.tenant_id,
      amount: Math.abs(invoice.amount), 
      description: `Pagamento Recebido: Fatura #${invoiceId.slice(0, 8).toUpperCase()} - ${invoice.customers?.name}`,
      service_type: 'invoice_payment'
    })

  if (walletError) {
    console.error("Erro ao creditar wallet:", walletError)
    return { error: "Fatura marcada como paga, mas houve erro ao atualizar saldo da carteira." }
  }

  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard/wallet')
  return { success: true }
}

/**
 * Cancela uma fatura (void).
 */
export async function voidInvoice(invoiceId: string) {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('invoices')
    .update({ status: 'void' })
    .eq('id', invoiceId)

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/invoices')
  return { success: true }
}

export async function createManualInvoice(data: { customer_id: string, amount: number, due_date: string }) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Tenant não identificado" }

  const { error } = await supabase.from('invoices').insert({
    tenant_id: profile.tenant_id,
    customer_id: data.customer_id,
    amount: data.amount,
    due_date: data.due_date,
    status: 'draft',
    issued_date: new Date().toISOString().split('T')[0]
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/invoices')
  return { success: true }
}
