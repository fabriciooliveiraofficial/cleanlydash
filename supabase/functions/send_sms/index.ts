
import { serve } from "http/server.ts"
import { createClient } from "@supabase/supabase-js"

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

        if (userError || !user) throw new Error('Unauthorized');

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get User's Phone Number
        const { data: settings } = await supabaseAdmin
            .from('telnyx_settings')
            .select('phone_number, api_key, managed_account_id, managed_api_key')
            .eq('user_id', user.id)
            .single();

        if (!settings?.phone_number) {
            throw new Error("You do not have a phone number to send from.");
        }

        // 2. Parse Body
        const { to, message, media_urls, sandbox } = await req.json();

        if (!to || !message) {
            throw new Error("Missing 'to' or 'message' fields.");
        }

        console.log(`Sending SMS from ${settings.phone_number} to ${to} [Sandbox: ${sandbox}]`);

        // 3. Logic
        if (sandbox) {
            // Log to DB only
            await supabaseAdmin.from('sms_logs').insert({
                tenant_id: user.id,
                direction: 'outbound',
                from_number: settings.phone_number,
                to_number: to,
                content: message,
                media_urls: media_urls,
                status: 'sent', // Autocomplete in sandbox
                cost: 0,
                price: 0
            });

            return new Response(
                JSON.stringify({ success: true, message: "SMS sent (Sandbox)", status: "sent" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );

        } else {
            // Real Send Logic
            let telnyxApiKey = Deno.env.get('TELNYX_API_KEY');

            // Try fetching from user settings first (if they BYOC)
            if (settings.api_key) {
                telnyxApiKey = settings.api_key;
            } else if (settings.managed_api_key) {
                telnyxApiKey = settings.managed_api_key;
            }

            // Fallback to Platform Settings
            if (!telnyxApiKey) {
                const { data } = await supabaseAdmin
                    .from('platform_settings')
                    .select('value')
                    .eq('key', 'TELNYX_API_KEY')
                    .maybeSingle();
                if (data?.value) telnyxApiKey = data.value;
            }

            if (!telnyxApiKey) throw new Error("No API Key found for sending SMS.");

            const telnyxUrl = 'https://api.telnyx.com/v2/messages';
            const body: any = {
                from: settings.phone_number,
                to: to,
                text: message
            };

            if (media_urls && Array.isArray(media_urls) && media_urls.length > 0) {
                body.media_urls = media_urls;
            }

            const response = await fetch(telnyxUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${telnyxApiKey}`
                },
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Telnyx SMS Error:", data);
                throw new Error(data.errors?.[0]?.detail || "Failed to send SMS");
            }

            await supabaseAdmin.from('sms_logs').insert({
                tenant_id: user.id,
                direction: 'outbound',
                from_number: settings.phone_number,
                to_number: to,
                content: message,
                status: 'sent',
                external_id: data.data?.id
            });

            return new Response(
                JSON.stringify({ success: true, message: "SMS sent successfully", data: data, status: "sent" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
