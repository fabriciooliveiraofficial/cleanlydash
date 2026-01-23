import { serve } from "http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
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

        const action = body.action || 'get';

        // GET current subscription
        if (action === 'get') {
            console.log(`[stripe-subscriptions] GET for customer: ${customerId}`);

            const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'all',
                limit: 10, // Get more to find any valid one
                expand: ['data.default_payment_method', 'data.items.data.price.product'],
            });

            console.log(`[stripe-subscriptions] Found ${subscriptions.data.length} subscriptions`);

            if (subscriptions.data.length === 0) {
                return new Response(JSON.stringify({
                    subscription: null,
                    debug: { customerId, count: 0 }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Find the best subscription (prefer active, then incomplete, then others)
            const priorityOrder = ['active', 'trialing', 'incomplete', 'past_due', 'unpaid', 'canceled'];
            const sortedSubs = subscriptions.data.sort((a, b) => {
                return priorityOrder.indexOf(a.status) - priorityOrder.indexOf(b.status);
            });

            const sub = sortedSubs[0];
            console.log(`[stripe-subscriptions] Selected subscription: ${sub.id} with status: ${sub.status}`);

            const item = sub.items.data[0];
            const product = item.price.product as Stripe.Product;

            return new Response(JSON.stringify({
                subscription: {
                    id: sub.id,
                    status: sub.status,
                    current_period_start: sub.current_period_start,
                    current_period_end: sub.current_period_end,
                    cancel_at_period_end: sub.cancel_at_period_end,
                    plan: {
                        id: item.price.id,
                        name: product.name,
                        amount: item.price.unit_amount,
                        currency: item.price.currency,
                        interval: item.price.recurring?.interval,
                    },
                    default_payment_method: sub.default_payment_method ? {
                        id: (sub.default_payment_method as Stripe.PaymentMethod).id,
                        brand: (sub.default_payment_method as Stripe.PaymentMethod).card?.brand,
                        last4: (sub.default_payment_method as Stripe.PaymentMethod).card?.last4,
                    } : null,
                },
                debug: { customerId, totalSubs: subscriptions.data.length, selectedStatus: sub.status }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { plan_id } = body;

        // CREATE new subscription
        if (action === 'create') {
            if (!plan_id) {
                return new Response(JSON.stringify({ error: 'Missing plan_id' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Fetch plan from database
            const { data: plan, error: planError } = await supabaseAdmin
                .from('plans')
                .select('*')
                .eq('id', plan_id)
                .single();

            if (planError || !plan) {
                return new Response(JSON.stringify({ error: `Plan not found: ${plan_id}` }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Create or find Stripe Product
            let productId: string;
            const existingProducts = await stripe.products.search({
                query: `metadata['db_plan_id']:'${plan_id}'`,
            });

            if (existingProducts.data.length > 0) {
                productId = existingProducts.data[0].id;
            } else {
                const product = await stripe.products.create({
                    name: plan.name,
                    description: `${plan.name} - Monthly Subscription`,
                    metadata: { db_plan_id: plan_id },
                });
                productId = product.id;
            }

            // Create or find Stripe Price
            let priceId: string;
            const existingPrices = await stripe.prices.search({
                query: `product:'${productId}' AND metadata['db_plan_id']:'${plan_id}'`,
            });

            if (existingPrices.data.length > 0 && existingPrices.data[0].unit_amount === Math.round(plan.price_monthly_usd * 100)) {
                priceId = existingPrices.data[0].id;
            } else {
                const price = await stripe.prices.create({
                    product: productId,
                    unit_amount: Math.round(plan.price_monthly_usd * 100),
                    currency: 'usd',
                    recurring: { interval: 'month' },
                    metadata: { db_plan_id: plan_id },
                });
                priceId = price.id;
            }

            // Create subscription
            const subscription = await stripe.subscriptions.create({
                customer: customerId,
                items: [{ price: priceId }],
                payment_behavior: 'default_incomplete',
                payment_settings: {
                    save_default_payment_method: 'on_subscription',
                    payment_method_types: ['card'],
                },
                expand: ['latest_invoice.payment_intent'],
                metadata: {
                    tenant_id: user.id,
                    db_plan_id: plan_id,
                },
            });

            const invoice = subscription.latest_invoice as Stripe.Invoice;
            const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

            return new Response(JSON.stringify({
                subscriptionId: subscription.id,
                clientSecret: paymentIntent.client_secret,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // CANCEL subscription
        if (action === 'cancel') {
            const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'active',
                limit: 1,
            });

            if (subscriptions.data.length === 0) {
                return new Response(JSON.stringify({ error: 'No active subscription' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const updated = await stripe.subscriptions.update(subscriptions.data[0].id, {
                cancel_at_period_end: true,
            });

            return new Response(JSON.stringify({
                success: true,
                cancel_at: updated.cancel_at,
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // REACTIVATE (undo cancel)
        if (action === 'reactivate') {
            const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                status: 'active',
                limit: 1,
            });

            if (subscriptions.data.length === 0) {
                return new Response(JSON.stringify({ error: 'No subscription to reactivate' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            await stripe.subscriptions.update(subscriptions.data[0].id, {
                cancel_at_period_end: false,
            });

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in stripe-subscriptions:", error);
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
