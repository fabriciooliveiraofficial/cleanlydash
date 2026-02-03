
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let diag: any = { stage: "start" };

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            diag.error = "Missing Authorization Header";
            throw new Error(diag.error);
        }

        diag.auth_header_start = authHeader.substring(0, 15) + "...";
        const token = authHeader.replace('Bearer ', '');
        diag.token_len = token.length;
        diag.token_hint = token.substring(0, 10) + "..." + token.substring(token.length - 10);

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
        if (userError || !user) {
            diag.auth_error = userError?.message || "User not found";
            diag.auth_status = userError?.status || 401;
            console.error("Auth failed:", diag.auth_error);
            return new Response(JSON.stringify({
                error: "Unauthorized: " + diag.auth_error,
                debug: diag
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401
            });
        }

        diag.user_id = user.id;

        const { phone_number, sandbox } = await req.json();

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Resolve Master Key Securely (Platform Priority)
        async function getMasterKey() {
            const { data: pKey } = await supabaseAdmin.from('platform_settings').select('value').eq('key', 'TELNYX_API_KEY').maybeSingle();
            const key = pKey?.value || Deno.env.get('TELNYX_MASTER_KEY') || Deno.env.get('TELNYX_API_KEY');
            if (!key) throw new Error("Plataforma não configurada: Chave Mestra Telnyx não encontrada.");
            return key.trim();
        }

        const telnyxApiKey = await getMasterKey();
        diag.resolved_from = "master_engine_standard";

        if (sandbox) {
            return new Response(JSON.stringify({ success: true, message: "Purchase simulated (Sandbox)", debug: diag }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Step 1: Create Number Order (Directly, skip reservation for speed unless complex matching needed)
        diag.step = "ordering";
        const response = await fetch(`https://api.telnyx.com/v2/number_orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${telnyxApiKey}`
            },
            body: JSON.stringify({
                phone_numbers: [{ phone_number: phone_number }]
            })
        });

        const resultData = await response.json();
        if (!response.ok) {
            return new Response(JSON.stringify({
                error: resultData?.errors?.[0]?.detail || 'Falha na compra do número',
                telnyx_error: resultData
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        // --- SELF-HEALING LINKAGE ---
        diag.step = "provisioning_linkage";

        // A. Ensure Tenant has resources (MP/Connection)
        // We call the internal logic by checking DB first
        let { data: settings } = await supabaseAdmin
            .from('telnyx_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        // If missing core IDs, we trigger a "Lazy Provision" right here using the Master Key
        if (!settings?.messaging_profile_id || !settings?.telnyx_connection_id) {
            console.log(`[buy_number] Missing tenant resources for ${user.id}. Provisioning now...`);
            const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telnyx-webhook`;

            let mpId = settings?.messaging_profile_id;
            let connId = settings?.telnyx_connection_id;
            let sipUser = settings?.sip_username;
            let sipPass = settings?.sip_password;

            if (!mpId) {
                const mpResp = await fetch('https://api.telnyx.com/v2/messaging_profiles', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${telnyxApiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: `Cleanlydash - ${user.id.substring(0, 8)}`, enabled: true })
                });
                const mpData = await mpResp.json();
                if (mpResp.ok) mpId = mpData.data.id;
            }

            if (!connId) {
                const scResp = await fetch('https://api.telnyx.com/v2/credential_connections', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${telnyxApiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        connection_name: `Cleanlydash - ${user.id.substring(0, 8)}`,
                        active: true,
                        webhook_event_url: webhookUrl,
                        webhook_api_version: '2',
                        inbound: { type: 'texml' }
                    })
                });
                const scData = await scResp.json();
                if (scResp.ok) {
                    connId = scData.data.id;
                    const credResp = await fetch(`https://api.telnyx.com/v2/telephony_credentials`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${telnyxApiKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ connection_id: connId })
                    });
                    const credData = await credResp.json();
                    if (credResp.ok) {
                        sipUser = credData.data.sip_username;
                        sipPass = credData.data.sip_password;
                    }
                }
            }

            // Update/Create settings row
            const { data: newSettings, error: upsertError } = await supabaseAdmin
                .from('telnyx_settings')
                .upsert({
                    user_id: user.id,
                    messaging_profile_id: mpId,
                    telnyx_connection_id: connId,
                    sip_username: sipUser,
                    sip_password: sipPass,
                    phone_number: phone_number, // Set the current number as primary
                    is_active: true
                }, { onConflict: 'user_id' }).select().single();

            if (!upsertError) settings = newSettings;
        }

        // B. Link the Number to Resources
        const boughtNumberId = resultData.data?.phone_numbers?.[0]?.id;
        if (boughtNumberId && settings) {
            const patchBody: any = {};
            if (settings.messaging_profile_id) patchBody.messaging_profile_id = settings.messaging_profile_id;
            if (settings.telnyx_connection_id) patchBody.connection_id = settings.telnyx_connection_id;

            await fetch(`https://api.telnyx.com/v2/phone_numbers/${boughtNumberId}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${telnyxApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(patchBody)
            });

            // Also update DB if the row already existed but with a different phone number
            if (settings.phone_number !== phone_number) {
                await supabaseAdmin.from('telnyx_settings').update({ phone_number: phone_number }).eq('user_id', user.id);
            }
        }

        return new Response(JSON.stringify({ success: true, data: resultData }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message, debug: diag }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
})
