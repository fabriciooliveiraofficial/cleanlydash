// ARQUIVO: lib/wallet.ts
import { createClient } from '@/lib/supabase/server'

/**
 * Retorna o saldo total de um Tenant usando o cache da tabela tenants.
 */
export async function checkBalance(tenantId: string): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tenants')
    .select('wallet_balance')
    .eq('id', tenantId)
    .single()

  if (error || !data) return 0

  return Number(data.wallet_balance || 0)
}

/**
 * Realiza um débito na carteira do Tenant de forma ATÔMICA via RPC.
 * @param amount Valor positivo (será convertido em negativo para o ledger)
 */
export async function debitWallet(
  tenantId: string,
  amount: number,
  description: string,
  serviceType: 'telephony' | 'ai_transcription' | 'sms'
) {
  const supabase = createClient()

  // Chamar a função RPC atômica que garante que o saldo não fique negativo
  const { data, error } = await supabase.rpc('process_wallet_transaction', {
    p_tenant_id: tenantId,
    p_amount: -Math.abs(amount),
    p_description: description,
    p_service_type: serviceType
  })

  if (error || !data?.success) {
    console.error("Erro ao debitar wallet via RPC:", error || data?.error)
    throw new Error(data?.error || "Falha ao processar transação financeira ou saldo insuficiente.")
  }

  return { success: true, newBalance: data.new_balance }
}
