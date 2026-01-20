// ARQUIVO: app/actions/ai.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { checkBalance, debitWallet } from '@/lib/wallet'

/**
 * Transcreve áudio verificando saldo e cobrando o uso.
 */
export async function transcribeAudio(audioFileBase64: string) {
  const supabase = createClient()
  
  // 1. Autenticação e Contexto
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autorizado")

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) throw new Error("Perfil não encontrado")

  // 2. Verificar Saldo (Custo fixo de R$ 0.10 por transcrição)
  const transcriptionCost = 0.10
  const balance = await checkBalance(profile.tenant_id)
  
  if (balance < transcriptionCost) {
    return { error: "Saldo insuficiente na Wallet para processar IA." }
  }

  try {
    // 3. Simulação de Chamada para OpenAI / Whisper
    // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { ... })
    
    // Mock de resposta de sucesso
    const mockTranscription = "Olá, esta é uma simulação de transcrição de turnover concluída com sucesso."
    
    // 4. Debitar Wallet se a IA funcionou
    await debitWallet(
      profile.tenant_id,
      transcriptionCost,
      "Transcrição de Checklist por IA",
      'ai_transcription'
    )

    return { text: mockTranscription, cost: transcriptionCost }

  } catch (error: any) {
    console.error("IA Action Error:", error.message)
    return { error: "Falha técnica ao processar áudio." }
  }
}
