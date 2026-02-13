
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

  const { data: invoice, error: iError } = await (supabase
    .from('invoices') as any)
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

  const { error: walletError } = await (supabase
    .from('wallet_ledger') as any)
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

// Updated createManualInvoice to support hybrid lines
export async function createManualInvoice(data: {
  customer_id: string,
  due_date: string,
  items: { description: string, amount: number, quantity: number, booking_id?: string, service_id?: string }[]
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Tenant não identificado" }

  // Calculate total from items
  const totalAmount = data.items.reduce((acc, item) => acc + (Number(item.amount) * Number(item.quantity)), 0)

  // 1. Create Invoice
  const { data: invoice, error } = await (supabase.from('invoices') as any).insert({
    tenant_id: profile.tenant_id,
    customer_id: data.customer_id,
    amount: totalAmount,
    due_date: data.due_date,
    status: 'draft',
    issued_date: new Date().toISOString().split('T')[0]
    // booking_id is left NULL for hybrid invoices
  })
    .select()
    .single()

  if (error) return { error: error.message }

  // 2. Create Invoice Lines
  if (data.items.length > 0) {
    const lines = data.items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      amount: item.amount,
      quantity: item.quantity,
      booking_id: item.booking_id || null,
      service_id: item.service_id || null
    }))

    const { error: linesError } = await (supabase.from('invoice_lines') as any).insert(lines)

    if (linesError) {
      // Rollback? ideally yes, but for now just error
      console.error("Error creating lines:", linesError)
      return { error: "Fatura criada, mas erro ao adicionar itens: " + linesError.message }
    }

    // 3. Update Bookings Status
    const bookingIds = data.items.map(i => i.booking_id).filter(Boolean) as string[]
    if (bookingIds.length > 0) {
      await (supabase.from('bookings') as any).update({ invoice_status: 'invoiced' }).in('id', bookingIds)
    }
  }

  revalidatePath('/dashboard/invoices')
  return { success: true }
}

export async function getUninvoicedBookings(customerId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('bookings')
    .select('*, services(name)')
    .eq('customer_id', customerId)
    .neq('invoice_status', 'invoiced') // assuming 'draft', 'pending', or null are valid for importing
    .neq('status', 'cancelled') // don't import cancelled bookings
    .order('start_time', { ascending: false })

  if (error) return []
  return data
}

/**
 * Envia notificação da fatura por SMS e Email.
 */
export async function sendInvoiceNotification(invoiceId: string) {
  const supabase = createClient()

  const { data: invoice, error: iError } = await (supabase
    .from('invoices') as any)
    .select('*, customers(*), tenant_profiles(*)')
    .eq('id', invoiceId)
    .single()

  if (iError || !invoice) return { error: "Fatura não encontrada." }

  const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://cleanlydash.com'}/invoice/${invoice.id}`
  const message = `Olá ${invoice.customers?.name}, sua fatura de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoice.amount)} está disponível: ${publicUrl}`

  try {
    // 1. Send SMS
    if (invoice.customers?.phone) {
      await supabase.functions.invoke('send_sms', {
        body: { to: invoice.customers.phone, message }
      })
    }

    // 2. Update status to 'sent'
    await (supabase
      .from('invoices') as any)
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoiceId)

    revalidatePath('/dashboard/invoices')
    return { success: true }
  } catch (err: any) {
    console.error("Error sending invoice notification:", err)
    return { error: "Erro ao enviar notificação: " + err.message }
  }
}

export async function deleteInvoice(invoiceId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (error) return { error: "Erro ao deletar fatura: " + error.message }
  revalidatePath('/dashboard/invoices')
  return { success: true }
}
