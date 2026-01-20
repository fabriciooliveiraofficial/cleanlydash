// ARQUIVO: app/(dashboard)/wallet/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getWalletStats() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Perfil não encontrado" }

  const { data: ledger } = await supabase
    .from('wallet_ledger')
    .select('amount, service_type')
    .eq('tenant_id', profile.tenant_id)

  if (!ledger) return { balance: 0, income: 0, expenses: 0 }

  const balance = ledger.reduce((acc, curr) => acc + curr.amount, 0)
  const income = ledger.filter(item => item.amount > 0).reduce((acc, curr) => acc + curr.amount, 0)
  const expenses = ledger.filter(item => item.amount < 0).reduce((acc, curr) => acc + Math.abs(curr.amount), 0)

  return { balance, income, expenses }
}

export async function getTransactions() {
  const supabase = createClient()
  const { data: transactions, error } = await supabase
    .from('wallet_ledger')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return []
  return transactions
}

export async function addFunds(amount: number) {
  // Simulação de adição de fundos (Em produção integraria com Stripe/Pix)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Perfil não encontrado" }

  const { error } = await supabase.from('wallet_ledger').insert({
    tenant_id: profile.tenant_id,
    amount: amount,
    description: "Recarga de saldo (Simulada)",
    service_type: 'deposit'
  })

  if (error) return { error: error.message }
  
  revalidatePath('/dashboard/wallet')
  return { success: true }
}