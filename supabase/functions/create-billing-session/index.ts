
import { serve } from "http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        // 1. Authenticate User
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) throw new Error("Unauthorized");

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // 2. Parse Body
        const { action, plan_id, quantity, return_url } = await req.json();
        // Actions: 'portal' | 'subscription_update' | 'token_purchase'

        if (!action) throw new Error("Missing action");

        // 3. Get Tenant Profile & Stripe Customer
        let { data: profile } = await supabaseAdmin
            .from('tenant_profiles')
            .select('id, stripe_customer_id, email, name')
            .eq('id', user.id)
            .single();

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        });

        // Ensure Stripe Customer Exists
        let customerId = profile?.stripe_customer_id;

        if (!customerId) {
            console.log(`Creating new Stripe customer for ${user.email}`);
            const customer = await stripe.customers.create({
                email: user.email,
                name: profile?.name || 'Tenant',
                metadata: { tenant_id: user.id }
            });
            customerId = customer.id;

            // Save back to DB
            await supabaseAdmin
                .from('tenant_profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id);
        }

        const origin = req.headers.get('origin') || 'https://cleanlydash.com';
        const callbackUrl = return_url || `${origin}/dashboard/settings`;

        // 4. Handle Actions
        if (action === 'portal') {
            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: callbackUrl,
            });
            return new Response(JSON.stringify({ url: session.url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'subscription_update') {
            if (!plan_id) throw new Error("Missing plan_id");

            // Fetch plan details
            const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', plan_id).single();
            if (!plan) throw new Error("Invalid Plan");

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                mode: 'subscription',
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: plan.name,
                            description: `Upgrade to ${plan.name}`,
                        },
                        unit_amount: Math.round(plan.price_monthly_usd * 100),
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                }],
                metadata: {
                    tenant_id: user.id,
                    plan_id: plan_id,
                    type: 'subscription_update'
                },
                success_url: `${callbackUrl}?success=true`,
                cancel_url: `${callbackUrl}?canceled=true`,
            });

            return new Response(JSON.stringify({ url: session.url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        if (action === 'token_purchase') {
            // Hardcoded Token Packs for now, or fetch from DB
            const TOKEN_PRICE_PER_1K = 500; // $5.00 for example
            const amount = 5000; // $50.00 fixed pack

            const session = await stripe.checkout.sessions.create({
                customer: customerId,
                payment_method_types: ['card'],
                mode: 'payment',
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'AI Token Pack (100k)',
                            description: 'Add 100,000 AI Tokens to your balance',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                }],
                metadata: {
                    tenant_id: user.id,
                    type: 'token_purchase',
                    tokens_amount: 100000
                },
                success_url: `${callbackUrl}?tokens_added=true`,
                cancel_url: `${callbackUrl}?canceled=true`,
            });

            return new Response(JSON.stringify({ url: session.url }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        throw new Error("Invalid Action");

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
