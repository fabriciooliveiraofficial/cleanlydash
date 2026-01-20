
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 1. Auth Check
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders })
        }

        // 2. Parse Body
        const { to, text, type = 'sms' } = await req.json()

        if (!to) {
            throw new Error("Missing 'to' phone number")
        }

        // 3. Fetch Telnyx Settings from DB
        const { data: settings, error: settingsError } = await supabase
            .from('telnyx_settings')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (settingsError || !settings) {
            console.error("Settings Error:", settingsError);
            throw new Error("Telnyx settings not configured for this account.")
        }

        const telnyxApiKey = settings.api_key;
        const fromNumber = settings.phone_number;

        if (!telnyxApiKey || !fromNumber) {
            throw new Error("Invalid Telnyx configuration (Missing API Key or Number)")
        }

        // 4. Call Telnyx API
        let telnyxUrl = 'https://api.telnyx.com/v2/messages'
        let body = {
            from: fromNumber,
            to: to,
            text: text
        }

        const response = await fetch(telnyxUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${telnyxApiKey}`
            },
            body: JSON.stringify(body)
        })

        const data = await response.json()

        if (!response.ok) {
            console.error("Telnyx API Error:", data)
            throw new Error(data.errors?.[0]?.detail || "Failed to send message")
        }

        // 5. Log to Database (sms_logs)
        await supabase.from('sms_logs').insert({
            tenant_id: user.id,
            direction: 'outbound',
            from_number: fromNumber,
            to_number: to,
            content: text,
            status: 'sent', // Optimistic
            external_id: data.data?.id,
        })

        return new Response(
            JSON.stringify({ success: true, data: data }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        )

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
