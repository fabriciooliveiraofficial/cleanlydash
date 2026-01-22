import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
    console.log(`[stripe-connect-oauth] INCOMING REQUEST: ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        const anonKeyHeader = req.headers.get('apikey');

        console.log('[stripe-connect-oauth] Headers Check:', {
            hasAuth: !!authHeader,
            hasApiKey: !!anonKeyHeader
        });

        if (!authHeader) {
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                details: 'Missing Authorization header in request'
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Create clients - check if env vars are present
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
            const missing = [];
            if (!supabaseUrl) missing.push('SUPABASE_URL');
            if (!supabaseAnonKey) missing.push('SUPABASE_ANON_KEY');
            if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

            console.error('[stripe-connect-oauth] Missing Env Vars:', missing);
            return new Response(JSON.stringify({
                error: 'Internal Server Error',
                details: `Missing environment variables: ${missing.join(', ')}`
            }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Verification client (User's context)
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        // Admin client (Bypass RLS for internal lookup/upsert)
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        // Get and Verify User - Passing token directly is more robust in Edge Functions
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

        if (userError || !user) {
            console.warn('[stripe-connect-oauth] Auth Failure with token:', userError?.message || 'No user found');
            return new Response(JSON.stringify({
                error: 'Unauthorized',
                details: userError?.message || 'Session invalid or expired'
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log('[stripe-connect-oauth] Authenticated User:', user.email);

        // Check if we have a valid body
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error("Invalid JSON body");
        }

        const { action, code, redirect_uri, state } = body;
        console.log('[stripe-connect-oauth] Action:', action);

        // Fetch settings - reuse user context if possible, otherwise admin
        const getSetting = async (key: string) => {
            const envVal = Deno.env.get(key);
            if (envVal) return envVal;

            try {
                const { data } = await adminClient.from('platform_settings').select('value').eq('key', key).single();
                return data?.value;
            } catch (e) {
                return null;
            }
        };

        const clientId = await getSetting('STRIPE_CLIENT_ID');
        const secretKey = await getSetting('STRIPE_SECRET_KEY');

        if (!clientId || !secretKey) {
            throw new Error("Stripe Configuration Missing. Please set STRIPE_CLIENT_ID and STRIPE_SECRET_KEY in Supabase Secrets.");
        }

        // ACTION: GET_AUTHORIZE_URL
        if (action === 'get_authorize_url') {
            const state = user.id; // Simple state for now to verify user match on return (CSRF)
            // Construct Stripe URL
            // Scope: read_write is standard for Connect
            const url = `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${clientId}&scope=read_write&redirect_uri=${encodeURIComponent(redirect_uri)}&state=${state}`;

            return new Response(JSON.stringify({ url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ACTION: EXCHANGE_CODE (Callback)
        if (action === 'exchange_token') {
            if (!code) throw new Error("No code provided");

            // VALIDATION: Compare state with user.id to prevent CSRF
            if (state !== user.id) {
                console.warn('[stripe-connect-oauth] State mismatch! State:', state, 'User:', user.id);
                return new Response(JSON.stringify({ error: 'Invalid state parameter' }), {
                    status: 403,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
            }

            // Call Stripe API
            const response = await fetch('https://connect.stripe.com/oauth/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: secretKey,
                    code: code
                })
            });

            const stripeData = await response.json();

            if (stripeData.error) {
                throw new Error(stripeData.error_description || stripeData.error);
            }

            const connectedAccountId = stripeData.stripe_user_id;

            // NEW: Fetch Account Details for a better UX (email, business name)
            const accountResponse = await fetch(`https://api.stripe.com/v1/accounts/${connectedAccountId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${secretKey}`
                }
            });
            const accountDetails = await accountResponse.json();

            // Save to Database
            // 1. Determine TENANT_ID
            // Option A: Pass it in. Option B: Look it up.
            // Let's look it up via team_members or if owner.

            // 1. Check if Owner
            const { data: ownerProfile } = await adminClient.from('tenant_profiles').select('id').eq('id', user.id).single();
            let tenantId = ownerProfile?.id;

            // 2. If not owner, check team members (though only owners should connect usually)
            if (!tenantId) {
                const { data: member } = await adminClient.from('team_members').select('tenant_id').eq('user_id', user.id).eq('role', 'owner').single();
                tenantId = member?.tenant_id;
            }

            if (!tenantId) throw new Error("User must be an Owner to connect Stripe.");

            // 3. Update connected_accounts
            await adminClient.from('connected_accounts').upsert({
                tenant_id: tenantId,
                stripe_account_id: connectedAccountId,
                stripe_account_type: 'standard',
                details_submitted: accountDetails.details_submitted,
                charges_enabled: accountDetails.charges_enabled,
                payouts_enabled: accountDetails.payouts_enabled
            });

            // 4. Update tenant_integrations (This is what the UI reads!)
            const { error: syncError } = await adminClient.from('tenant_integrations').upsert({
                tenant_id: tenantId,
                stripe_account_id: connectedAccountId,
                stripe_status: accountDetails.charges_enabled ? 'active' : 'pending',
                stripe_details: {
                    email: accountDetails.email || accountDetails.support_email,
                    business_name: accountDetails.business_profile?.name || accountDetails.settings?.dashboard?.display_name,
                    charges_enabled: accountDetails.charges_enabled,
                    payouts_enabled: accountDetails.payouts_enabled,
                    country: accountDetails.country,
                    default_currency: accountDetails.default_currency
                },
                stripe_connected_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            if (syncError) {
                console.error('[stripe-connect-oauth] Sync Error:', syncError);
                throw new Error("Failed to sync integration data: " + syncError.message);
            }

            return new Response(JSON.stringify({
                success: true,
                stripe_user_id: connectedAccountId,
                account_name: accountDetails.business_profile?.name || accountDetails.settings?.dashboard?.display_name
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // ACTION: DISCONNECT
        if (action === 'disconnect') {
            // 1. Check if Owner
            const { data: ownerProfile } = await adminClient.from('tenant_profiles').select('id').eq('id', user.id).single();
            let tenantId = ownerProfile?.id;

            if (!tenantId) {
                const { data: member } = await adminClient.from('team_members').select('tenant_id').eq('user_id', user.id).eq('role', 'owner').single();
                tenantId = member?.tenant_id;
            }

            if (!tenantId) throw new Error("Apenas o proprietário (Owner) pode desconectar o Stripe.");

            console.log('[stripe-connect-oauth] Disconnecting Stripe for tenant:', tenantId);

            // 2. Clear connected_accounts
            await adminClient.from('connected_accounts').delete().eq('tenant_id', tenantId);

            // 3. Reset tenant_integrations
            const { error: resetError } = await adminClient.from('tenant_integrations').upsert({
                tenant_id: tenantId,
                stripe_account_id: null,
                stripe_status: 'disconnected',
                stripe_details: {},
                stripe_connected_at: null,
                updated_at: new Date().toISOString()
            });

            if (resetError) throw new Error("Falha ao resetar integração: " + resetError.message);

            return new Response(JSON.stringify({ success: true, message: "Stripe desconectado com sucesso." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        throw new Error("Invalid Action");

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
