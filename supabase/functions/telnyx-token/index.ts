
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

        // Get SIP credentials from platform_settings
        const { data: sipUsername } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'TELNYX_SIP_USERNAME')
            .maybeSingle();

        const { data: sipPassword } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'TELNYX_SIP_PASSWORD')
            .maybeSingle();

        const { data: callerIdNumber } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'TELNYX_CALLER_ID')
            .maybeSingle();

        // Get from user's telnyx_settings as fallback
        const { data: userSettings } = await supabaseAdmin
            .from('telnyx_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        const login = sipUsername?.value || userSettings?.sip_username;
        const password = sipPassword?.value || userSettings?.sip_password;
        const callerId = callerIdNumber?.value || userSettings?.phone_number;

        if (!login || !password) {
            console.error("Missing SIP credentials", { login: !!login, password: !!password });
            return new Response(JSON.stringify({
                error: 'SIP credentials not configured',
                details: 'Please configure TELNYX_SIP_USERNAME and TELNYX_SIP_PASSWORD in platform_settings'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        console.log(`Returning SIP credentials for user: ${login}`);

        // Return SIP credentials for direct authentication
        return new Response(
            JSON.stringify({
                authType: 'sip_credentials',
                login: login,
                password: password,
                callerId: callerId || ''
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error("Error in telnyx-token:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
