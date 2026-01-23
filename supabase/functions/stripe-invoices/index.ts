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

        if (!profile?.stripe_customer_id) {
            return new Response(JSON.stringify({ invoices: [] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        });

        const customerId = profile.stripe_customer_id;

        // Parse body
        let body: any = {};
        try {
            body = await req.json();
        } catch {
            body = {};
        }

        const limit = body.limit || 10;

        // List invoices (default action)
        const invoices = await stripe.invoices.list({
            customer: customerId,
            limit: limit,
        });

        const formatted = invoices.data.map(inv => ({
            id: inv.id,
            number: inv.number,
            status: inv.status,
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            currency: inv.currency,
            created: inv.created,
            period_start: inv.period_start,
            period_end: inv.period_end,
            hosted_invoice_url: inv.hosted_invoice_url,
            invoice_pdf: inv.invoice_pdf,
            description: inv.description || inv.lines.data[0]?.description || 'Subscription',
        }));

        return new Response(JSON.stringify({ invoices: formatted }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error("Error in stripe-invoices:", error);
        return new Response(JSON.stringify({
            error: error.message,
            stack: error.stack
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
