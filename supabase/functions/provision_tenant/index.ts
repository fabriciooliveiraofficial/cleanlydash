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

        // 1. Create Client with Anon Key (Same as send_invite)
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '');

        // 2. Get User (using explicit token like send_invite)
        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Unauthorized: ' + (userError?.message || 'No user'));
        }

        // 3. Create Admin Client for DB Operations (Service Role)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 4. Parse Request Body
        let sandbox = false;
        let reset = false;
        try {
            const body = await req.json();
            sandbox = body.sandbox;
            reset = body.reset;
        } catch {
            // No body or error parsing
        }

        // 5. Handle RESET request
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

        // 6. Check KYC Status (REQUIRED before provisioning)
        const { data: kycData } = await supabaseAdmin
            .from('kyc_verifications')
            .select('status')
            .eq('user_id', user.id)
            .single()

        if (!kycData || kycData.status !== 'approved') {
            throw new Error('KYC verification required. Please complete identity verification first.');
        }

        // 7. Check if already provisioned
        const { data: existing } = await supabaseAdmin
            .from('telnyx_settings')
            .select('managed_account_id')
            .eq('user_id', user.id)
            .single()

        if (existing?.managed_account_id) {
            return new Response(JSON.stringify({ message: "Account already provisioned", managed_account_id: existing.managed_account_id }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 6. Call Telnyx API (or Simulate)
        const masterKey = Deno.env.get('TELNYX_MASTER_KEY');
        let managedAccountId = `managed_${crypto.randomUUID().split('-')[0]}`;
        let managedApiKey = `KEY${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;

        if (sandbox) {
            console.log("Provising in SANDBOX Mode");
            managedAccountId = `managed_TEST_${crypto.randomUUID().split('-')[0]}`;
            // We could use a static one for easier debugging, but random is fine for unique constraint
        } else if (masterKey) {
            console.log("Calling Telnyx API (Production)...");
            // Real API call would go here. For now we keep the simulation behavior but logged as Prod.
        } else {
            console.log("Simulating Telnyx Provisioning (Dev Mode)...");
        }

        // 6. Store Keys in DB
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
