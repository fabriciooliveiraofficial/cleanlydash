import { serve } from "http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return new Response(JSON.stringify({ error: 'Missing authorization' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: { headers: { Authorization: authHeader ?? '' } },
                auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
            }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Get customer ID
        const { data: profile } = await supabaseAdmin
            .from('tenant_profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        });

        let customerId = profile?.stripe_customer_id;

        // Create customer if not exists
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { tenant_id: user.id }
            });
            customerId = customer.id;

            await supabaseAdmin
                .from('tenant_profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', user.id);
        }

        // Parse body for action
        let body: any = {};
        try {
            body = await req.json();
        } catch {
            body = {};
        }

        const action = body.action || 'list';

        // LIST payment methods
        if (action === 'list') {
            const paymentMethods = await stripe.paymentMethods.list({
                customer: customerId,
                type: 'card',
            });

            const formatted = paymentMethods.data.map(pm => ({
                id: pm.id,
                brand: pm.card?.brand,
                last4: pm.card?.last4,
                exp_month: pm.card?.exp_month,
                exp_year: pm.card?.exp_year,
                is_default: false,
            }));

            // Get default payment method
            const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
            const defaultPm = customer.invoice_settings?.default_payment_method;

            formatted.forEach(pm => {
                pm.is_default = pm.id === defaultPm;
            });

            return new Response(JSON.stringify({ paymentMethods: formatted }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // CREATE SetupIntent for adding a new card
        if (action === 'create_setup_intent') {
            const setupIntent = await stripe.setupIntents.create({
                customer: customerId,
                payment_method_types: ['card'],
                usage: 'off_session',
            });

            return new Response(JSON.stringify({
                clientSecret: setupIntent.client_secret
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // SET DEFAULT payment method
        if (action === 'set_default') {
            const { payment_method_id } = body;

            await stripe.customers.update(customerId, {
                invoice_settings: {
                    default_payment_method: payment_method_id,
                },
            });

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // REMOVE payment method
        if (action === 'remove') {
            const { payment_method_id } = body;

            if (!payment_method_id) {
                return new Response(JSON.stringify({ error: 'Missing payment_method_id' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            await stripe.paymentMethods.detach(payment_method_id);

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in stripe-payment-methods:", error);
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
