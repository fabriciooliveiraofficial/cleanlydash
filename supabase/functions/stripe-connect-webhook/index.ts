import { serve } from "http/server.ts";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
});

// Provides access to the webhook secret
const endpointSecret = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET') || "";

serve(async (req) => {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
        return new Response("No signature", { status: 400 });
    }

    try {
        const body = await req.text(); // Read raw body for verification
        let event;

        // Verify Signature
        try {
            event = await stripe.webhooks.constructEventAsync(
                body,
                signature,
                endpointSecret
            );
        } catch (err) {
            console.error(`Webhook signature verification failed.`, err.message);
            return new Response(err.message, { status: 400 });
        }

        // Initialize Admin Supabase
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Handle Events
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // Find invoice by ID (we stored session.id as stripe_invoice_id usually, or use a metadata lookup if we passed it)
                // In create-payment-request, we stored: stripe_invoice_id: session.id

                // Note: Since this is a Connect webhook, `event.account` will give us the connected account ID if needed.
                // But we can just search our global invoices table for this session ID.

                const { error } = await supabaseAdmin
                    .from('tenant_invoices')
                    .update({
                        status: 'paid',
                        paid_at: new Date().toISOString()
                    })
                    .eq('stripe_invoice_id', session.id);

                if (error) console.error('Error updating invoice:', error);
                else console.log(`Invoice paid: ${session.id}`);
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }
});
