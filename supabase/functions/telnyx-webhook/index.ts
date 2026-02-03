
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Verify Signature (Crucial for Security)
        // For now, we'll trust the path is secret or just proceed, but in Prod check Telnyx-Signature-Ed25519
        // const signature = req.headers.get("telnyx-signature-ed25519");
        // const timestamp = req.headers.get("telnyx-timestamp");
        // ... verification logic ...

        const { data, meta } = await req.json()
        const eventType = data.event_type
        const payload = data.payload

        console.log(`Received Telnyx Event: ${eventType}`)

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service Role needed to bypass RLS for callbacks
        )

        if (eventType === 'message.received') {
            // Inbound SMS/MMS
            const from = payload.from.phone_number
            const to = payload.to[0].phone_number // This is OUR number
            const text = payload.text
            const messageId = payload.id

            // 1. Identify Tenant by "To" number
            const { data: settings } = await supabase
                .from('telnyx_settings')
                .select('user_id') // user_id is the tenant_id
                .eq('phone_number', to)
                .single()

            if (settings) {
                // 2. Log to SMS Logs
                await supabase.from('sms_logs').insert({
                    tenant_id: settings.user_id,
                    direction: 'inbound',
                    from_number: from,
                    to_number: to,
                    content: text,
                    status: 'delivered',
                    external_id: messageId
                })
                console.log(`Inbound SMS logged for tenant ${settings.user_id}`);
            } else {
                console.warn(`Received SMS for unknown number: ${to}`);
            }

        } else if (eventType === 'call.initiated') {
            const callControlId = payload.call_control_id;
            const from = payload.from;
            const to = payload.to; // This is the DID called (e.g. +1234567890)

            console.log(`[telnyx-webhook] Voice Call Initiated: ${callControlId} from ${from} to ${to}`);

            // 1. Identify Tenant & SIP Username by "To" number (Normalizing for + prefix)
            const cleanTo = to.startsWith('+') ? to : `+${to}`;
            const simpleTo = to.replace('+', '');

            const { data: settings, error: lookupError } = await supabase
                .from('telnyx_settings')
                .select('user_id, sip_username')
                .or(`phone_number.eq.${cleanTo},phone_number.eq.${simpleTo}`)
                .maybeSingle();

            if (lookupError) {
                console.error(`[telnyx-webhook] Database error during tenant lookup:`, lookupError.message);
            }

            if (settings?.sip_username) {
                const sipTarget = settings.sip_username.includes('@')
                    ? settings.sip_username
                    : `${settings.sip_username}@sip.telnyx.com`;

                console.log(`[telnyx-webhook] Routing inbound call for ${to} to SIP Target: ${sipTarget} (Tenant: ${settings.user_id})`);

                // 2. Log Inbound Call (Status: ringing)
                await supabase.from('call_logs').insert({
                    tenant_id: settings.user_id,
                    direction: 'inbound',
                    from_number: from,
                    to_number: to,
                    status: 'ringing',
                    external_id: callControlId
                });

                // 3. Return TeXML to Dial the registered SIP client
                const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                    <Record channels="dual" format="mp3" playBeep="true" />
                    <Dial>
                        <Sip>sip:${sipTarget}</Sip>
                    </Dial>
                </Response>`;

                return new Response(xmlResponse, {
                    headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
                    status: 200
                });
            } else {
                console.warn(`[telnyx-webhook] Inbound call to unknown number or missing SIP user mapping: ${to}`);
                // Return a clean Reject to avoid hanging or carrier timeouts
                return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/></Response>`, {
                    headers: { ...corsHeaders, 'Content-Type': 'application/xml' },
                    status: 200
                });
            }

        } else if (eventType === 'call.hangup') {
            const callId = payload.call_control_id;
            const duration = payload.duration || 0;
            const connectionId = payload.connection_id;

            console.log(`Call hangup: ${callId}, Duration: ${duration}s, Connection: ${connectionId}`);

            // 1. Identify Tenant
            const { data: tenantSettings } = await supabase
                .from('telnyx_settings')
                .select('user_id')
                .eq('telnyx_connection_id', connectionId)
                .maybeSingle();

            if (tenantSettings) {
                const tenantId = tenantSettings.user_id;

                // 2. Get Pricing
                const { data: sub } = await supabase
                    .from('tenant_subscriptions')
                    .select('plan_id')
                    .eq('tenant_id', tenantId)
                    .maybeSingle();

                const planId = sub?.plan_id || 'voice_starter';
                const { data: priceSetting } = await supabase
                    .from('platform_settings')
                    .select('value')
                    .eq('key', `TELEPHONY_PRICES:${planId}`)
                    .maybeSingle();

                let voicePrice = 0.08; // Fallback
                if (priceSetting) {
                    try {
                        const parsed = JSON.parse(priceSetting.value);
                        voicePrice = parseFloat(parsed.voice || '0.08');
                    } catch (e) { }
                }

                // 3. Calculate Cost (Always ceil to full minute for telecom billing)
                const minutes = Math.ceil(duration / 60);
                const cost = minutes * voicePrice;

                // 4. Update Call Log & Increment Spend
                await supabase
                    .from('call_logs')
                    .update({
                        status: 'completed',
                        duration_seconds: duration,
                        cost: cost
                    })
                    .eq('external_id', callId);

                await supabase.rpc('increment_voice_spend', {
                    t_id: tenantId,
                    amount: cost
                });

                console.log(`Updated voice spend for tenant ${tenantId}: +$${cost}`);
            }

        } else if (eventType === 'call.recording.saved') {
            // 1. Get Recording Data
            const recordingUrl = payload.recording_urls.mp3;
            // Note: Telnyx doesn't always send call_control_id in payload for this event directly, 
            // but usually sends 'call_leg_id' or 'call_session_id'. 
            // We assume 'call_control_id' or we might need to lookup by 'call_leg_id'.
            // Payload usually has: call_leg_id, call_session_id, recording_urls, duration...
            const callLegId = payload.call_leg_id;

            console.log(`Recording saved for leg ${callLegId}: ${recordingUrl}`);

            // 2. Lookup Tenant (In a real app, we'd lookup the Call Log by call_leg_id to get tenant_id)
            // For now, we will query the call_logs table if we were storing legs, OR 
            // we query telnyx_settings based on the 'connection_id' if available, or just broadcast.
            // Simplified: we assume we can find the tenant from the active call log or we pass it in metadata if possible.
            // FALLBACK: Query 'call_logs' where external_id (call_control_id/leg_id) matches.

            // NOTE: In this architecture, we might not have a perfect link yet without correct call logging on 'initiate'.
            // We will attempt to find the tenant via the call log.

            const { data: callLog } = await supabase
                .from('call_logs')
                .select('tenant_id, id')
                .eq('external_id', callLegId) // Assuming we stored leg_id as external_id
                .maybeSingle();

            if (callLog) {
                // 3. Update Call Log with Recording URL
                await supabase.from('call_logs')
                    .update({ recording_url: recordingUrl })
                    .eq('id', callLog.id);

                // 4. Trigger Async AI Processing
                // We don't await this, we just fire and forget (or await if we want to ensure trigger)
                await supabase.functions.invoke('process_audio', {
                    body: {
                        audio_url: recordingUrl,
                        tenant_id: callLog.tenant_id,
                        call_control_id: callLegId
                    }
                });
                console.log("Triggered AI processing");
            } else {
                console.warn(`Could not find Call Log for leg ${callLegId} to attach recording.`);
                // Fallback: If we can't find the call log, we might just log it as an orphan recording or try to 
                // identify tenant validation another way (e.g. Connection ID).
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Webhook Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
