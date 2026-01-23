
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
            .select('phone_number, managed_account_id')
            .eq('user_id', user.id)
            .single();

        if (!settings?.phone_number) {
            throw new Error("You do not have a phone number to send from.");
        }

        // 2. Parse Body
        const { to, message, sandbox } = await req.json();

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
                status: 'sent', // Autocomplete in sandbox
                cost: 0,
                price: 0
            });

            return new Response(
                JSON.stringify({ success: true, message: "SMS sent (Sandbox)", status: "sent" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );

        } else {
            // Real Send Logic (Placeholder)
            // TODO: Integrate Telnyx Messages API

            // For now, we allow it but mark as queued/simulated if no real API implemented yet
            await supabaseAdmin.from('sms_logs').insert({
                tenant_id: user.id,
                direction: 'outbound',
                from_number: settings.phone_number,
                to_number: to,
                content: message,
                status: 'queued',
                cost: 0.004,
                price: 0.05
            });

            return new Response(
                JSON.stringify({ success: true, message: "SMS queued (Real)", status: "queued" }),
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
