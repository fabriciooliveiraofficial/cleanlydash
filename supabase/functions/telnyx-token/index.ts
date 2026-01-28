
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
        const authHeader = req.headers.get('Authorization')!;
        console.log("Authorization Header Present:", !!authHeader);
        if (authHeader) {
            const jwt = authHeader.replace('Bearer ', '');
            console.log("JWT Payload Hint:", jwt.split('.')[1]?.slice(0, 20) + "...");
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const tokenStr = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(tokenStr);

        if (!user) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Standardized Key Resolution (Priority: Platform DB -> Env -> User Settings)
        let telnyxApiKey: string | undefined = undefined;
        let resolutionSource: string = 'none';

        // 1. Platform Database Settings (Admin-configured)
        const { data: platformKeyData, error: platformError } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'TELNYX_API_KEY')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (platformError) console.error("Platform Settings Error:", platformError);

        if (platformKeyData?.value && platformKeyData.value.length > 20) {
            telnyxApiKey = platformKeyData.value.trim();
            resolutionSource = 'database_platform';
        }

        // 2. Fallback: Environment Variables
        if (!telnyxApiKey) {
            const envKey = Deno.env.get('TELNYX_MASTER_KEY') || Deno.env.get('TELNYX_API_KEY');
            if (envKey && envKey.length > 20) {
                telnyxApiKey = envKey;
                resolutionSource = 'environment_variable';
            }
        }

        // 3. Fallback: User Settings
        if (!telnyxApiKey) {
            const { data: settings, error: settingsError } = await supabaseAdmin.from('telnyx_settings').select('*');
            if (settingsError) console.error("Telnyx Settings Fetch Error:", settingsError);

            const myRow = settings?.find(s => s.user_id === user.id);
            const fallbackRow = settings?.find(s => s.api_key || s.managed_api_key);
            const targetRow = myRow || fallbackRow;

            if (targetRow) {
                const pk = targetRow.api_key || targetRow.managed_api_key;
                if (pk && pk.length > 20) {
                    telnyxApiKey = pk.trim();
                    resolutionSource = 'database_user_settings';
                }
            }
        }

        console.log(`Telnyx Key Resolved via ${resolutionSource}. Length: ${telnyxApiKey?.length || 0}`);

        if (!telnyxApiKey) throw new Error('TELNYX_API_KEY missing or invalid');

        // Get SIP Credential
        const { data: platformSip } = await supabaseAdmin.from('platform_settings').select('value').eq('key', 'TELNYX_SIP_CREDENTIAL_ID').maybeSingle();
        const sipCredentialId = platformSip?.value;

        if (!sipCredentialId) throw new Error('TELNYX_SIP_CREDENTIAL_ID missing');

        const response = await fetch(`https://api.telnyx.com/v2/telephony_credentials/${sipCredentialId}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${telnyxApiKey}`
            }
        })

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Telnyx API Error:", errorBody);
            // Return the actual Telnyx error body in the response
            return new Response(JSON.stringify({
                error: `Telnyx Token Error: ${response.statusText}`,
                details: errorBody
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: response.status,
            })
        }

        const token = await response.text();

        return new Response(
            JSON.stringify({ token, refresh_token: "not_implemented" }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
