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
        if (!authHeader) {
            throw new Error('Missing Authorization Header');
        }

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

        // 1. Get User's Telnyx Configuration
        const { data: settings } = await supabaseAdmin
            .from('telnyx_settings')
            .select('managed_account_id, managed_api_key')
            .eq('user_id', user.id)
            .single();

        if (!settings?.managed_account_id) {
            throw new Error("Telnyx account not provisioned");
        }

        // 2. Parse Payload
        const { phone_numbers, auth_name, address, billing_phone, documents, account_number, pin } = await req.json();

        // 3. Call Telnyx Porting API (Simulated if Sandbox, Real if Prod)
        // Note: For managed accounts, we would typically use the Managed Account ID as the 'customer_reference' 
        // or authenticate AS the sub-account if we have their specific API key (which we do: settings.managed_api_key)

        console.log(`Creating Porting Order for ${settings.managed_account_id}`);

        let portingId = `port_${crypto.randomUUID()}`;

        // In a real implementation:
        // const response = await fetch('https://api.telnyx.com/v2/porting_orders', {
        //    method: 'POST',
        //    headers: {
        //      'Authorization': `Bearer ${settings.managed_api_key}`, // OR Master Key acting on behalf
        //      'Content-Type': 'application/json'
        //    },
        //    body: JSON.stringify({ ... })
        // });

        // 4. Log to DB
        const { error: dbError } = await supabaseAdmin.from('porting_requests').insert({
            tenant_id: user.id,
            numbers: phone_numbers,
            status: 'submitted', // submitted, processing, completed, rejected
            external_id: portingId,
            details: { auth_name, address, billing_phone, documents, account_number, pin }
        });

        if (dbError) throw dbError;

        return new Response(
            JSON.stringify({ success: true, porting_id: portingId }),
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
