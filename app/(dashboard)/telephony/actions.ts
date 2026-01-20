
// ARQUIVO: app/(dashboard)/telephony/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

const TELNYX_API_KEY = process.env.TELNYX_API_KEY

/**
 * Gera um token WebRTC para o agente atual.
 * Requer que o Tenant tenha uma 'Connection ID' da Telnyx configurada.
 */
export async function getTelnyxToken() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: tenant } = await supabase
    .from('profiles')
    .select('tenant_id, tenants(telnyx_connection_id)')
    .eq('id', user.id)
    .single()

  const connectionId = tenant?.tenants?.telnyx_connection_id

  if (!connectionId || !TELNYX_API_KEY) {
    return { error: "Configuração de telefonia incompleta para este Tenant." }
  }

  try {
    // Endpoint para gerar token sob demanda (WebRTC)
    const response = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${connectionId}/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error("Falha ao obter token da Telnyx")
    }

    const token = await response.text() // Telnyx retorna o JWT puro
    
    return { 
      token, 
      connectionId 
    }
  } catch (err: any) {
    console.error("Telnyx Token Error:", err.message)
    return { error: err.message }
  }
}
