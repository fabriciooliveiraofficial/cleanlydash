// ARQUIVO: app/(dashboard)/settings/telephony/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkBalance, debitWallet } from '@/lib/wallet'

const TELNYX_API_KEY = process.env.TELNYX_API_KEY

/**
 * Busca números disponíveis na API da Telnyx
 */
export async function searchAvailableNumbers(areaCode: string, countryCode: string = 'US') {
  if (!TELNYX_API_KEY) return { error: "Telnyx API Key não configurada no servidor." }

  try {
    const response = await fetch(
      `https://api.telnyx.com/v2/number_searches?filter[national_destination_code]=${areaCode}&filter[country_code]=${countryCode}&filter[limit]=5`,
      {
        headers: {
          'Authorization': `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) throw new Error("Erro ao buscar números na Telnyx")
    const data = await response.json()
    
    return { data: data.data }
  } catch (err: any) {
    return { error: err.message }
  }
}

/**
 * Compra um número e debita o custo ($1.00 base) da Wallet do Tenant
 */
export async function purchaseNumber(phoneNumber: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Não autorizado" }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: "Tenant não identificado" }

  // 1. Verificar saldo (Custo estimado de compra: R$ 10.00 / aprox $2.00)
  const PURCHASE_COST = 10.00 
  const balance = await checkBalance(profile.tenant_id)
  if (balance < PURCHASE_COST) {
    return { error: "Saldo insuficiente na Wallet para adquirir um novo número corporativo." }
  }

  try {
    // 2. Comprar na Telnyx
    const telnyxRes = await fetch(`https://api.telnyx.com/v2/number_orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_numbers: [{ phone_number: phoneNumber }]
      })
    })

    const telnyxData = await telnyxRes.json()
    if (!telnyxRes.ok) throw new Error(telnyxData.errors?.[0]?.detail || "Erro na Telnyx Order")

    const telnyxId = telnyxData.data.phone_numbers[0].id

    // 3. Salvar no Banco Local
    const { error: dbError } = await supabase.from('phone_numbers').insert({
      tenant_id: profile.tenant_id,
      phone_number: phoneNumber,
      telnyx_id: telnyxId,
      status: 'active',
      friendly_name: `Escritório Principal (${phoneNumber.slice(-4)})`
    })

    if (dbError) throw dbError

    // 4. Debitar Wallet
    await debitWallet(
      profile.tenant_id,
      PURCHASE_COST,
      `Compra de Número Telefônico: ${phoneNumber}`,
      'telephony'
    )

    revalidatePath('/dashboard/settings/telephony')
    return { success: true }

  } catch (err: any) {
    console.error("Purchase Error:", err.message)
    return { error: err.message }
  }
}
