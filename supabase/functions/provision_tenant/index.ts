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

    try {
        const authHeader = req.headers.get('Authorization');
        console.log("[provision_tenant] Auth Header present:", !!authHeader);
        if (!authHeader) throw new Error('Missing Authorization Header');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            console.error("[provision_tenant] Auth Error:", userError?.message || "No user found for token");
            throw new Error('Unauthorized: ' + (userError?.message || 'No user'));
        }
        console.log("[provision_tenant] Authenticated user:", user.id);

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body = await req.json();
        const { action, api_key, sip_id, sandbox, reset, is_platform_key } = body;

        // Verify Admin for Platform Actions
        const { data: roleData } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single();

        const isAdmin = roleData?.role === 'super_admin' || roleData?.role === 'admin';

        // 1. Action: Save Key (Bypass RLS)
        if (action === 'save_key') {
            if (!api_key) throw new Error('API Key is required');

            if (is_platform_key) {
                if (!isAdmin) throw new Error('Apenas administradores podem salvar a Chave Global da Plataforma.');

                console.log(`[provision_tenant] Saving Platform Global Key. Key length: ${api_key.trim().length}`);

                const { data: upsertData, error: pError } = await supabaseAdmin
                    .from('platform_settings')
                    .upsert({ key: 'TELNYX_API_KEY', value: api_key.trim() }, { onConflict: 'key' })
                    .select();

                console.log(`[provision_tenant] Upsert result:`, { upsertData, error: pError?.message });

                if (sip_id) {
                    const { error: sipError } = await supabaseAdmin
                        .from('platform_settings')
                        .upsert({ key: 'TELNYX_SIP_CREDENTIAL_ID', value: sip_id.trim() }, { onConflict: 'key' });
                    if (sipError) console.log(`[provision_tenant] SIP ID save error:`, sipError.message);
                }

                if (pError) {
                    console.error(`[provision_tenant] Platform key save FAILED:`, pError);
                    throw pError;
                }

                // Verify the save
                const { data: verifyData } = await supabaseAdmin
                    .from('platform_settings')
                    .select('key, value')
                    .eq('key', 'TELNYX_API_KEY')
                    .maybeSingle();

                console.log(`[provision_tenant] Verification read:`, verifyData ? `Found, length=${verifyData.value?.length}` : 'NOT FOUND');

                return new Response(JSON.stringify({
                    success: true,
                    message: "Chave salva com sucesso",
                    debug: {
                        saved_key_length: api_key.trim().length,
                        verified: !!verifyData?.value,
                        verified_length: verifyData?.value?.length
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            } else {
                console.log(`Saving User Specific Key for user ${user.id}`);
                const { error: upsertError } = await supabaseAdmin
                    .from('telnyx_settings')
                    .upsert({
                        user_id: user.id,
                        api_key: api_key.trim(),
                        is_active: true
                    }, { onConflict: 'user_id' });

                if (upsertError) throw upsertError;
            }

            return new Response(JSON.stringify({ success: true, message: "Chave salva com sucesso" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // 2. Action: Reset
        if (reset) {
            console.log(`Resetting Telnyx settings for user ${user.id}`);
            const { error: deleteError } = await supabaseAdmin
                .from('telnyx_settings')
                .delete()
                .eq('user_id', user.id);

            if (deleteError) throw deleteError;

            return new Response(JSON.stringify({ success: true, message: "Integration reset successfully" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        // Standard Helper: Resolve Master Key Securely
        async function getMasterKey() {
            const { data: pKey } = await supabaseAdmin.from('platform_settings').select('value').eq('key', 'TELNYX_API_KEY').maybeSingle();
            const key = pKey?.value || Deno.env.get('TELNYX_MASTER_KEY') || Deno.env.get('TELNYX_API_KEY');
            if (!key) throw new Error("Plataforma não configurada: Chave Mestra Telnyx não encontrada.");
            return key.trim();
        }

        // Action: Save Key (Internal Admin Use Only)
        if (action === 'save_key' && isAdmin) {
            const { api_key, sip_id } = await req.json();
            if (api_key) await supabaseAdmin.from('platform_settings').upsert({ key: 'TELNYX_API_KEY', value: api_key }, { onConflict: 'key' });
            if (sip_id) await supabaseAdmin.from('platform_settings').upsert({ key: 'TELNYX_SIP_CREDENTIAL_ID', value: sip_id }, { onConflict: 'key' });
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const effectiveMasterKey = await getMasterKey();
        const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/telnyx-webhook`;

        // ---------------------------------------------------------
        // SELF-HEALING ENGINE (Provisioning Logic)
        // ---------------------------------------------------------
        async function provision(targetUserId: string) {
            console.log(`[Master Engine] Provisioning user: ${targetUserId}`);

            const { data: settings } = await supabaseAdmin
                .from('telnyx_settings')
                .select('*')
                .eq('user_id', targetUserId)
                .maybeSingle();

            let mpId = settings?.messaging_profile_id;
            let connId = settings?.telnyx_connection_id;
            let sipUser = settings?.sip_username;
            let sipPass = settings?.sip_password;

            // 1. Ensure Messaging Profile (SMS Isolation)
            if (!mpId) {
                const mpResp = await fetch('https://api.telnyx.com/v2/messaging_profiles', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${effectiveMasterKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: `Cleanlydash - ${targetUserId.substring(0, 8)}`, enabled: true })
                });
                const mpData = await mpResp.json();
                if (mpResp.ok) mpId = mpData.data.id;
                else console.error("[Master Engine] MP Creation Failed:", mpData);
            }

            // 2. Ensure SIP Connection (Voice Isolation)
            if (!connId) {
                const scResp = await fetch('https://api.telnyx.com/v2/credential_connections', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${effectiveMasterKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        connection_name: `Cleanlydash - ${targetUserId.substring(0, 8)}`,
                        active: true,
                        webhook_event_url: webhookUrl,
                        webhook_api_version: '2',
                        inbound: { type: 'texml' }
                    })
                });
                const scData = await scResp.json();
                if (scResp.ok) {
                    connId = scData.data.id;
                    // Immediately provision Telephony Credentials
                    const credResp = await fetch(`https://api.telnyx.com/v2/telephony_credentials`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${effectiveMasterKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ connection_id: connId })
                    });
                    const credData = await credResp.json();
                    if (credResp.ok) {
                        sipUser = credData.data.sip_username;
                        sipPass = credData.data.sip_password;
                    }
                }
            }

            // 3. Fix Phone Number Linkages (SMS & Voice Routing)
            if (settings?.phone_number && (mpId || connId)) {
                console.log(`[Master Engine] Patching number ${settings.phone_number} to MP: ${mpId} and Conn: ${connId}`);
                const searchResp = await fetch(`https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${settings.phone_number.replace('+', '').trim()}`, {
                    headers: { 'Authorization': `Bearer ${effectiveMasterKey}` }
                });
                const searchData = await searchResp.json();
                const telnyxId = searchData.data?.[0]?.id;

                if (telnyxId) {
                    console.log(`[Master Engine] Found Telnyx ID ${telnyxId} for number ${settings.phone_number}. Patching...`);
                    const patchBody: any = {};
                    if (mpId) patchBody.messaging_profile_id = mpId;
                    if (connId) patchBody.connection_id = connId;

                    const pResp = await fetch(`https://api.telnyx.com/v2/phone_numbers/${telnyxId}`, {
                        method: 'PATCH',
                        headers: { 'Authorization': `Bearer ${effectiveMasterKey}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify(patchBody)
                    });
                    const pData = await pResp.json();
                    if (!pResp.ok) {
                        console.error(`[Master Engine] Patch FAILED for ${telnyxId}:`, pData);
                    } else {
                        console.log(`[Master Engine] Patch SUCCESS for ${telnyxId}`);
                    }
                } else {
                    console.warn(`[Master Engine] Could not find number ${settings.phone_number} on Telnyx account to patch.`);
                }
            }

            // 4. Update Database
            const { error: upsertError } = await supabaseAdmin
                .from('telnyx_settings')
                .upsert({
                    user_id: targetUserId,
                    messaging_profile_id: mpId,
                    telnyx_connection_id: connId,
                    sip_username: sipUser,
                    sip_password: sipPass,
                    is_active: true
                }, { onConflict: 'user_id' });

            if (upsertError) throw upsertError;

            return { mpId, connId, status: 'synced' };
        }

        // Exec Action
        if (action === 'diagnosis') {
            const { data: current } = await supabaseAdmin.from('telnyx_settings').select('*').eq('user_id', user.id).maybeSingle();
            if (!current?.phone_number) throw new Error("Inquilino não possui número configurado.");

            const searchResp = await fetch(`https://api.telnyx.com/v2/phone_numbers?filter[phone_number]=${current.phone_number.replace('+', '').trim()}`, {
                headers: { 'Authorization': `Bearer ${effectiveMasterKey}` }
            });
            const searchData = await searchResp.json();
            const telnyxResource = searchData.data?.[0];

            return new Response(JSON.stringify({
                success: true,
                diagnosis: {
                    phone_number: current.phone_number,
                    messaging_profile_id: current.messaging_profile_id,
                    connection_id: current.telnyx_connection_id,
                    telnyx_resource: telnyxResource ? {
                        id: telnyxResource.id,
                        messaging_profile_id: telnyxResource.messaging_profile_id,
                        connection_id: telnyxResource.connection_id,
                        status: telnyxResource.status,
                        matches_db: telnyxResource.messaging_profile_id === current.messaging_profile_id
                    } : 'Not found on Telnyx'
                }
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (action === 'repair_voice' || action === 'repair_all' || action === 'sync') {
            if (!isAdmin) throw new Error('Acesso negado.');
            const { data: all } = await supabaseAdmin.from('telnyx_settings').select('user_id');
            const results = [];
            for (const row of (all || [])) {
                try {
                    const res = await provision(row.user_id);
                    results.push({ user_id: row.user_id, ...res });
                } catch (e: any) {
                    results.push({ user_id: row.user_id, status: 'error', error: e.message });
                }
            }
            return new Response(JSON.stringify({ success: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Default: Provision current user
        const result = await provision(user.id);
        return new Response(JSON.stringify({ success: true, ...result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("[Master Engine Error]", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
