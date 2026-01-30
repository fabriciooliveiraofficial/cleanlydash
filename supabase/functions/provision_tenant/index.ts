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
        if (!authHeader) throw new Error('Missing Authorization Header');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Unauthorized: ' + (userError?.message || 'No user'));
        }

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

        // 3. Action: Provision (Existing logic)
        const masterKey = Deno.env.get('TELNYX_MASTER_KEY') || Deno.env.get('TELNYX_API_KEY');
        // If not in env, check platform_settings
        let effectiveMasterKey = masterKey;
        if (!effectiveMasterKey) {
            const { data: pKey } = await supabaseAdmin.from('platform_settings').select('value').eq('key', 'TELNYX_API_KEY').maybeSingle();
            effectiveMasterKey = pKey?.value;
        }

        let managedAccountId = `managed_${crypto.randomUUID().split('-')[0]}`;
        let managedApiKey = `KEY${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;

        if (effectiveMasterKey && !sandbox) {
            console.log("Calling Telnyx API (Production Simulation)...");
            // In a real reseller flow, we'd use the platform key to create a Managed Account inside Telnyx here.
        }

        const { error: upsertError } = await supabaseAdmin
            .from('telnyx_settings')
            .upsert({
                user_id: user.id,
                managed_account_id: managedAccountId,
                managed_api_key: managedApiKey,
                is_active: true
            }, { onConflict: 'user_id' })

        if (upsertError) throw upsertError;

        return new Response(
            JSON.stringify({ success: true, managed_account_id: managedAccountId }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
