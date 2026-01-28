
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

    let diag: any = {
        stage: "start",
        platform_keys: [],
        telnyx_rows: []
    };

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

        diag.current_user_id = user.id;

        const { country_code, state, city, area_code, sandbox } = await req.json();

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Resolve Key (Priority: Database Platform Settings -> System Env -> User Settings)
        let telnyxApiKey: string | undefined = undefined;

        // 1. FIRST: Try Platform Settings (Admin-configured key in DB)
        const { data: platformKeyData, error: platformKeyError } = await supabaseAdmin
            .from('platform_settings')
            .select('value, created_at')
            .eq('key', 'TELNYX_API_KEY')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        diag.platform_query_error = platformKeyError?.message;
        diag.platform_key_found = !!platformKeyData?.value;

        if (platformKeyData?.value && platformKeyData.value.length > 20) {
            telnyxApiKey = platformKeyData.value.trim();
            diag.resolved_from = "platform_settings_db";
        }

        // 2. FALLBACK: Try Environment Variables
        if (!telnyxApiKey || telnyxApiKey.length < 20) {
            const envKey = Deno.env.get('TELNYX_MASTER_KEY') || Deno.env.get('TELNYX_API_KEY');
            if (envKey && envKey.length > 20) {
                telnyxApiKey = envKey;
                diag.resolved_from = "environment_variable";
            }
        }

        // 2. Fallback to User Settings
        if (!telnyxApiKey || telnyxApiKey.length < 20) {
            const { data: settings } = await supabaseAdmin.from('telnyx_settings').select('*');
            const myRow = settings?.find(s => s.user_id === user.id);
            const fallbackRow = settings?.find(s => s.api_key || s.managed_api_key);
            const targetRow = myRow || fallbackRow;

            if (targetRow) {
                if (targetRow.api_key && targetRow.api_key.length > 20) {
                    telnyxApiKey = targetRow.api_key.trim();
                    diag.resolved_from = "row_api_key";
                } else if (targetRow.managed_api_key && targetRow.managed_api_key.length > 20) {
                    telnyxApiKey = targetRow.managed_api_key.trim();
                    diag.resolved_from = "row_managed_key";
                }
            }
        }

        if (telnyxApiKey) {
            diag.final_key_len = telnyxApiKey.length;
            diag.final_key_mask = `${telnyxApiKey.substring(0, 5)}...${telnyxApiKey.substring(telnyxApiKey.length - 5)}`;
            diag.key_fingerprint = telnyxApiKey.substring(0, 5) + "...";
        }

        if (sandbox || !telnyxApiKey || telnyxApiKey.length < 20) {
            return new Response(JSON.stringify({
                data: [{
                    phone_number: "+12125550000",
                    national_destination_code: "212",
                    region_information: { region_name: "Mock City (Sandbox/No Valid Key)", region_code: "MC" },
                    cost_information: { upfront_cost: "0", monthly_cost: "0", currency: "USD" }
                }],
                debug: diag
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Real Search
        const url = new URL('https://api.telnyx.com/v2/available_phone_numbers');
        url.searchParams.append('filter[country_code]', country_code || 'US');
        url.searchParams.append('filter[limit]', '5');
        url.searchParams.append('filter[reservable]', 'true');
        url.searchParams.append('filter[exclude_held_numbers]', 'true');
        if (state) url.searchParams.append('filter[administrative_area]', state);
        if (area_code) url.searchParams.append('filter[national_destination_code]', area_code);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${telnyxApiKey}`, 'Accept': 'application/json' }
        });

        const resultData = await response.json();
        if (!response.ok) {
            return new Response(JSON.stringify({
                error: 'Telnyx search failed',
                debug: diag,
                telnyx_error: resultData
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        return new Response(JSON.stringify({ ...resultData, debug: diag }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message, debug: diag }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
})
