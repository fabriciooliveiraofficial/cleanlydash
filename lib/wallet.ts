// ARQUIVO: lib/wallet.ts
import { createClient } from '@/lib/supabase/server'

/**
 * Retorna o saldo total de um Tenant (Créditos - Débitos).
 */
export async function checkBalance(tenantId: string): Promise<number> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('wallet_ledger')
    .select('amount')
    .eq('tenant_id', tenantId)

  if (error || !data) return 0

  return data.reduce((acc, curr) => acc + curr.amount, 0)
}

/**
 * Realiza um débito na carteira do Tenant após validar saldo.
 * @param amount Valor positivo (será convertido em negativo para o ledger)
 */
export async function debitWallet(
  tenantId: string, 
  amount: number, 
  description: string, 
  serviceType: 'telephony' | 'ai_transcription' | 'sms'
) {
  const supabase = createClient()
  
  // 1. Verificar saldo atual
  const currentBalance = await checkBalance(tenantId)
  
  if (currentBalance < amount) {
    throw new Error("Saldo Insuficiente na Wallet do AirGoverness.")
  }

  // 2. Inserir registro de débito (Valor negativo)
  const { error } = await supabase.from('wallet_ledger').insert({
    tenant_id: tenantId,
    amount: -Math.abs(amount),
    description,
    service_type: serviceType
  })

  if (error) {
    console.error("Erro ao debitar wallet:", error)
    throw new Error("Falha ao processar transação financeira.")
  }

  return { success: true, newBalance: currentBalance - amount }
}
