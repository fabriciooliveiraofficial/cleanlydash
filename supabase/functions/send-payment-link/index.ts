// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// POLYFILL for Deno.writeAll (Required by smtp lib)
if (typeof Deno.writeAll === "undefined") {
    // @ts-ignore
    Deno.writeAll = async (writer: Deno.Writer, data: Uint8Array) => {
        let n = 0;
        while (n < data.length) {
            const nwritten = await writer.write(data.subarray(n));
            n += nwritten;
        }
    };
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const origin = req.headers.get('origin') || 'https://cleanlydash.com';

        const adminClient = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Auth Check (Bypass Gateway strategy)
        let authHeader = req.headers.get('X-Supabase-Auth');
        if (!authHeader) authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            throw new Error("Missing Authorization header");
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await adminClient.auth.getUser(token);

        if (userError || !user) {
            throw new Error("Unauthorized: Invalid Token");
        }

        // 2. Parse Request
        const { invoice_id } = await req.json();
        if (!invoice_id) throw new Error("Missing invoice_id");

        console.log(`[send-payment-link] Processing for Invoice: ${invoice_id} by User: ${user.email}`);

        // 3. Fetch Invoice Details
        const { data: invoice, error: invError } = await adminClient
            .from('tenant_invoices')
            .select('*')
            .eq('id', invoice_id)
            .single();

        if (invError || !invoice) throw new Error("Invoice not found");

        // Start Tenant Context Check
        // Ensure the invoice belongs to a tenant that the user is part of
        // (Simplification: Assuming user.id == invoice.tenant_id for now, or use team logic if needed)
        // For strict security, we should check team_members. But typical flow is user.id == tenant_id for owners.
        const { data: member } = await adminClient
            .from('team_members')
            .select('tenant_id')
            .eq('user_id', user.id)
            .eq('tenant_id', invoice.tenant_id)
            .single();

        const isOwner = user.id === invoice.tenant_id;

        if (!isOwner && !member) {
            throw new Error("Unauthorized to access this invoice");
        }
        // End Tenant Context Check


        // 4. Fetch SMTP Settings
        // 4. Fetch SMTP Settings
        const { data: smtp } = await adminClient
            .from('smtp_settings')
            .select('*')
            .eq('user_id', invoice.tenant_id)
            // .eq('is_active', true) // Relaxed check: if row exists, we assume active for now
            .single();

        if (!smtp) {
            console.error(`[send-payment-link] Missing settings for tenant ${invoice.tenant_id}`);
            throw new Error(`SMTP Settings not configured for tenant ${invoice.tenant_id}`);
        }

        // 5. Construct Email
        const link = `${origin}/invoice/${invoice.id}`;
        // Fallback name if missing
        const customerName = invoice.customer_name || 'Valued Customer';
        const amountFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency || 'USD' }).format(invoice.amount);

        const emailContent = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #333;">Hello, ${customerName}</h2>
                <p style="font-size: 16px; color: #555;">You have received a new invoice from <strong>${smtp.from_name}</strong>.</p>
                
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #888;">Description</p>
                    <p style="margin: 5px 0 15px 0; font-size: 18px; font-weight: bold; color: #111;">${invoice.description}</p>
                    
                    <p style="margin: 0; font-size: 14px; text-transform: uppercase; color: #888;">Amount Due</p>
                    <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #4f46e5;">${amountFormatted}</p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="${link}" style="background-color: #4f46e5; color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
                        Pay Now
                    </a>
                </div>

                <p style="font-size: 14px; color: #888; text-align: center;">
                    If the button above does not work, copy and paste the link below:<br/>
                    <a href="${link}" style="color: #4f46e5;">${link}</a>
                </p>
            </div>
        `;

        // 6. Send Email via SMTP
        const client = new SmtpClient();

        // Connect Strategy
        try {
            if (smtp.encryption === 'ssl') {
                await client.connectTLS({
                    hostname: smtp.host,
                    port: smtp.port,
                    username: smtp.username,
                    password: smtp.password,
                });
            } else {
                // STARTTLS or None (Library handles STARTTLS usually via connect() + upgrade options, 
                // but this lib 'connect' does opportunistic TLS often. 
                // For simplicity and matching 'test_smtp', we use connect() 
                await client.connect({
                    hostname: smtp.host,
                    port: smtp.port,
                    username: smtp.username,
                    password: smtp.password,
                });
            }

            await client.send({
                from: `"${smtp.from_name}" <${smtp.from_email}>`,
                to: invoice.customer_email,
                subject: `Invoice Received: ${invoice.description}`,
                content: "Please enable HTML to view this invoice.", // Fallback text
                html: emailContent
            });

            await client.close();
            console.log(`[send-payment-link] Email sent successfully into ${invoice.customer_email}`);

        } catch (smtpError) {
            console.error('[send-payment-link] SMTP Error:', smtpError);
            throw new Error(`SMTP Error: ${smtpError.message}`);
        }

        // 7. Update Invoice Status (Optional: add 'sent' status or log 'last_sent_at')
        // For now, we just return success.

        return new Response(JSON.stringify({ success: true, message: "E-mail enviado com sucesso!" }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error('[send-payment-link] Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
