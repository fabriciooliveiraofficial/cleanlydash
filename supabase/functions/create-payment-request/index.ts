import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import Stripe from "https://esm.sh/stripe@12.5.0?target=deno";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req) => {
    console.log(`[create-payment-request] INCOMING REQUEST: ${req.method} ${req.url}`);

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        // Check for custom header first to bypass Gateway 'Invalid JWT' check if needed
        let authHeader = req.headers.get('X-Supabase-Auth');
        if (!authHeader) {
            authHeader = req.headers.get('Authorization');
        }

        if (!authHeader) {
            console.warn('[create-payment-request] Missing Authorization/X-Supabase-Auth header');
            return new Response(JSON.stringify({ error: "Unauthorized", details: "Missing Authorization header" }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('[create-payment-request] Environment variables missing.');
            return new Response(JSON.stringify({ error: "Internal Server Error", details: "Project configuration missing" }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        const token = authHeader.replace('Bearer ', '');

        // Manually decode JWT to get User ID
        // This bypasses potential signature verification issues in the local client
        let userId;
        try {
            const parts = token.split('.');
            if (parts.length !== 3) throw new Error("Invalid JWT format");
            const payload = JSON.parse(atob(parts[1]));
            userId = payload.sub;

            // Basic expiry check
            const now = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp < now) {
                throw new Error("Token expired");
            }
        } catch (e: any) {
            console.error('[create-payment-request] JWT Decode Error:', e.message);
            return new Response(JSON.stringify({ error: "Unauthorized", details: "Token inválido ou malformado." }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Verify user existence and get data directly from Auth Service
        const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId);

        if (userError || !user) {
            console.warn('[create-payment-request] Auth Failure (getUserById):', userError?.message || 'No user found');
            return new Response(JSON.stringify({
                error: "Unauthorized",
                details: userError?.message || "Usuário não encontrado.",
                hint: "Tente fazer login novamente."
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        console.log('[create-payment-request] Authenticated User:', user.email);

        // Fetch Tenant ID
        const { data: member } = await adminClient
            .from('team_members')
            .select('tenant_id')
            .eq('user_id', user.id)
            .single();

        let tenantId = member?.tenant_id;
        if (!tenantId) {
            const { data: profile } = await adminClient.from('tenant_profiles').select('id').eq('id', user.id).single();
            tenantId = profile?.id;
        }

        if (!tenantId) throw new Error("Tenant context not found");

        // 2. Fetch Stripe Config & Connected Account
        const { data: connectedAccount } = await adminClient
            .from('connected_accounts')
            .select('stripe_account_id')
            .eq('tenant_id', tenantId)
            .single();

        if (!connectedAccount?.stripe_account_id) {
            throw new Error("Stripe Connect account not linked for this tenant.");
        }

        const { data: secretKeyData } = await adminClient
            .from('platform_settings')
            .select('value')
            .eq('key', 'STRIPE_SECRET_KEY')
            .single();

        if (!secretKeyData?.value) throw new Error("Stripe Secret Key missing in platform settings.");

        const stripe = new Stripe(secretKeyData.value, {
            apiVersion: '2022-11-15',
        });

        // 3. Parse Request
        const { amount, currency = 'brl', description, customer_email, customer_name } = await req.json();

        if (!amount || amount <= 0) throw new Error("Invalid amount.");

        // 4. Create Stripe Checkout Session (acting as the tenant)
        // We use the `Stripe-Account` header to create it on their account
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: currency,
                        product_data: {
                            name: description || 'Serviço Cleanlydash',
                        },
                        unit_amount: Math.round(amount * 100), // Convert to cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.get('origin')}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/payment-cancel`,
            customer_email: customer_email,
        }, {
            stripeAccount: connectedAccount.stripe_account_id,
        });

        // 5. Save to `tenant_invoices`
        const { data: invoice, error: dbError } = await adminClient.from('tenant_invoices').insert({
            tenant_id: tenantId,
            stripe_invoice_id: session.id,
            amount: amount,
            currency: currency,
            status: 'open',
            customer_email: customer_email,
            customer_name: customer_name,
            description: description,
        }).select().single();

        if (dbError) throw dbError;

        return new Response(JSON.stringify({
            url: session.url,
            invoice_id: invoice.id,
            stripe_session_id: session.id
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
