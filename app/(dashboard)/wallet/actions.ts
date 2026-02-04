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

  // 1. Fetch balance from cache (FAST)
  const { data: tenant } = await supabase
    .from('tenants')
    .select('wallet_balance')
    .eq('id', profile.tenant_id)
    .single();

  const balance = Number(tenant?.wallet_balance || 0);

  // 2. We can still calculate income/expenses from ledger if needed for stats,
  // but let's limit it to recent or just provide the balance for now to keep it "compact and efficient"
  // If the user REALLY wants income/expenses, we fetch the ledger.
  const { data: ledger } = await supabase
    .from('wallet_ledger')
    .select('amount')
    .eq('tenant_id', profile.tenant_id);

  const income = ledger?.filter(item => item.amount > 0).reduce((acc, curr) => acc + curr.amount, 0) || 0;
  const expenses = ledger?.filter(item => item.amount < 0).reduce((acc, curr) => acc + Math.abs(curr.amount), 0) || 0;

  return { balance, income, expenses }
}

export async function getTransactions() {
  const supabase = createClient()
  const { data: transactions, error } = await supabase
    .from('wallet_ledger')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50) // Increased limit slightly for better audit

  if (error) return []
  return transactions
}

export async function addFunds(amount: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Perfil não encontrado" }

  // Use the atomic RPC for addition as well
  const { data, error } = await (supabase as any).rpc('process_wallet_transaction', {
    p_tenant_id: profile.tenant_id,
    p_amount: Math.abs(amount), // Positive for deposit
    p_description: "Recarga de saldo (Simulada)",
    p_service_type: 'deposit'
  });

  if (error || !data?.success) return { error: error?.message || data?.error || "Erro ao processar depósito" }

  revalidatePath('/dashboard/wallet')
  return { success: true }
}