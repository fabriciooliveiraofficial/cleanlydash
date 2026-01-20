// ARQUIVO: app/api/webhooks/telnyx/route.ts
import { NextResponse } from 'next/server'
import { debitWallet } from '@/lib/wallet'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const event = payload.data
    const eventType = event.event_type
    const callControlId = event.payload.call_control_id

    const supabase = createClient()

    // 1. Identificar o Tenant vinculado à conexão Telnyx
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('telnyx_connection_id', event.payload.connection_id)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not mapped to this connection" }, { status: 404 })
    }

    // 2. Processar Eventos do Ciclo de Vida da Chamada
    switch (eventType) {
      case 'call.initiated':
        // Registrar início da chamada
        await supabase.from('comms_logs').insert({
          tenant_id: tenant.id,
          direction: event.payload.direction,
          from_number: event.payload.from,
          to_number: event.payload.to,
          status: 'ringing',
          telnyx_call_control_id: callControlId
        })
        break

      case 'call.answered':
        // Atualizar status para em curso
        await supabase
          .from('comms_logs')
          .update({ status: 'in-progress' })
          .eq('telnyx_call_control_id', callControlId)
        break

      case 'call.completed':
        const durationSecs = event.payload.duration_secs || 0
        const minutes = Math.ceil(durationSecs / 60)
        const costPerMinute = 0.15 // R$ 0.15 por minuto
        const totalCost = minutes * costPerMinute

        // Finalizar registro e salvar custo
        await supabase
          .from('comms_logs')
          .update({ 
            status: 'completed',
            duration_secs: durationSecs,
            cost: totalCost
          })
          .eq('telnyx_call_control_id', callControlId)

        // Debitar Wallet do Cliente
        if (totalCost > 0) {
          await debitWallet(
            tenant.id,
            totalCost,
            `Chamada Telnyx: ${minutes} min(s)`,
            'telephony'
          )
        }
        break

      case 'call.recording.saved':
        // Vincular gravação ao log
        await supabase
          .from('comms_logs')
          .update({ recording_url: event.payload.recording_urls.mp3 })
          .eq('telnyx_call_control_id', callControlId)
        break
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error("Webhook Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
