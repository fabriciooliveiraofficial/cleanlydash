import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { debitWallet } from '@/lib/wallet'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const event = payload.data
    const eventType = event.event_type
    const callControlId = event.payload.call_control_id

    // Use Service Role to bypass RLS and ensures we can write logs
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Identificar o Tenant vinculado à conexão Telnyx
    // Note: This relies on Telnyx sending connection_id. 
    // If connection_id is missing, we might need another lookup strategy (e.g. from/to number).
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('telnyx_connection_id', event.payload.connection_id)
      .maybeSingle()

    if (!tenant) {
      // Fallback: Try to find tenant by phone number if connection_id fails
      // This is important for some call flows
      console.warn(`Tenant not found by connection_id: ${event.payload.connection_id}. Event: ${eventType}`)
      return NextResponse.json({ error: "Tenant not mapped to this connection" }, { status: 404 })
    }

    // 2. Processar Eventos do Ciclo de Vida da Chamada
    // Writing to 'call_logs' (new table)
    switch (eventType) {
      case 'call.initiated':
        await supabase.from('call_logs').insert({
          tenant_id: tenant.id,
          direction: event.payload.direction,
          from_number: event.payload.from,
          to_number: event.payload.to,
          status: 'ringing',
          external_id: callControlId
        })
        break

      case 'call.answered':
        await supabase
          .from('call_logs')
          .update({ status: 'in-progress' })
          .eq('external_id', callControlId)
        break

      case 'call.completed':
        const durationSecs = event.payload.duration_secs || 0
        const minutes = Math.ceil(durationSecs / 60)
        const costPerMinute = 0.15 // R$ 0.15 por minuto
        const totalCost = minutes * costPerMinute

        await supabase
          .from('call_logs')
          .update({
            status: 'completed',
            duration_seconds: durationSecs,
            cost: totalCost
          })
          .eq('external_id', callControlId)

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
        await supabase
          .from('call_logs')
          .update({ recording_url: event.payload.recording_urls.mp3 })
          .eq('external_id', callControlId)
        break
    }

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error("Webhook Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
