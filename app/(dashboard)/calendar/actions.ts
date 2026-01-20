// ARQUIVO: app/(dashboard)/calendar/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBookingStatus(id: string, newStatus: string) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { error } = await supabase
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/calendar')
  return { success: true }
}

export async function createBooking(formData: {
  customer_id: string;
  start_time: string;
  price: number;
  notes?: string;
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

  // Check simples de conflito (exemplo: mesma hora exata)
  const { data: conflict } = await supabase
    .from('bookings')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('start_time', formData.start_time)
    .single()

  if (conflict) {
    return { error: "Já existe um serviço agendado para este horário exato." }
  }

  const { error } = await supabase.from('bookings').insert({
    tenant_id: profile.tenant_id,
    customer_id: formData.customer_id,
    start_time: formData.start_time,
    price: formData.price,
    notes: formData.notes,
    status: 'pending'
  })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/calendar')
  return { success: true }
}