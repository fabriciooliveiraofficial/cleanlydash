// @ts-nocheck
import { serve } from "http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { SmtpClient } from "smtp";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// POLYFILL for Deno.writeAll
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
    const { method } = req
    console.log(`[send_quote_email] Request method: ${method}`)

    if (method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body = await req.json();
        console.log("[send_quote_email] Request Body:", JSON.stringify(body, null, 2));

        const {
            clientEmail,
            clientName,
            serviceName,
            recurringServiceName,
            frequency,
            estimate,
            recurringEstimate,
            checklist,
            addons,
            confirmationUrl,
            selectedDate,
            selectedSlot,
            profile // Company Profile (Name, Logo, Address, etc.)
        } = body;

        // 1. Get Auth Context (Tenant ID)
        const authHeader = req.headers.get('Authorization')!;
        if (!authHeader) {
            console.error("[send_quote_email] Error: Missing Authorization header");
            throw new Error("Missing Authorization header");
        }

        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) {
            console.error("[send_quote_email] Error: Unauthorized", authError);
            throw new Error("Unauthorized or invalid token");
        }

        const currentUserId = user.id;
        console.log(`[send_quote_email] Authorized user: ${currentUserId}`);

        // 1.5 Get the actual Tenant ID for this user
        // We look up the team_member record to find which tenant they belong to
        const { data: memberData, error: memberError } = await supabaseAdmin
            .from('team_members')
            .select('tenant_id')
            .eq('user_id', currentUserId)
            .maybeSingle();

        if (memberError) {
            console.error("[send_quote_email] Error: Failed to resolve tenant_id", memberError);
        }

        // If not found in team_members, they might be the owner themselves (since tenant_id = owner_id in most tables)
        // or it's a new setup. We'll fallback to currentUserId as the tenantId.
        const tenantId = memberData?.tenant_id || currentUserId;
        console.log(`[send_quote_email] Resolved tenant_id: ${tenantId}`);

        // 2. Fetch Tenant SMTP Settings (linked to the resolved tenantId)
        const { data: smtp, error: smtpError } = await supabaseAdmin
            .from('smtp_settings')
            .select('*')
            .eq('user_id', tenantId)
            .maybeSingle();

        if (smtpError) {
            console.error("[send_quote_email] Error: SMTP Query failed", smtpError);
            throw new Error(`SMTP Query error: ${smtpError.message}`);
        }

        if (!smtp) {
            console.error("[send_quote_email] Error: SMTP Settings not found for tenant", tenantId);
            throw new Error("SMTP Configuration not found or inactive. Please configure your email in Settings > Email Server.");
        }

        console.log(`[send_quote_email] SMTP Settings found for ${smtp.from_email}`);

        // 3. Construct professional HTML email
        // ... (rest of the email construction)

        // 3. Construct professional HTML email (World Class Design)
        const checklistHtml = checklist.map((t: any) => `
            <li style="margin-bottom: 8px; font-size: 14px; color: #475569;">
                <span style="color: #6366f1; margin-right: 8px;">✓</span> ${t.title} ${t.price > 0 ? `<span style="color: #94a3b8; font-size: 12px;">(+$${t.price})</span>` : ''}
            </li>
        `).join('');

        const addonsHtml = addons.map((a: any) => `
            <li style="margin-bottom: 8px; font-size: 14px; color: #475569;">
                <span style="color: #10b981; margin-right: 8px;">+</span> ${a.name} <span style="font-weight: bold; color: #334155;">(+$${a.price})</span>
            </li>
        `).join('');

        const companyLogo = profile?.logo_url ? `<img src="${profile.logo_url}" alt="${profile.company_name}" style="height: 48px; width: auto; max-width: 150px; object-fit: contain; margin-bottom: 16px;">` : `<div style="font-size: 24px; font-weight: 900; color: #6366f1; margin-bottom: 16px;">${profile?.company_name || 'Cleaning Service'}</div>`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap');
                </style>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Plus Jakarta Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <!-- Branding Header -->
                            <table role="presentation" width="100%" maxWidth="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin-bottom: 24px;">
                                <tr>
                                    <td align="center">
                                        ${companyLogo}
                                        <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Official Service Quote</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Main Card -->
                            <table role="presentation" width="100%" maxWidth="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); overflow: hidden;">
                                <!-- Greeting -->
                                <tr>
                                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                        <h1 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Hello, ${clientName || 'Valued Customer'}!</h1>
                                        <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.6;">We've prepared your custom quote. Here are the details for your <span style="font-weight: 700; color: #6366f1;">${serviceName}</span> service.</p>
                                    </td>
                                </tr>

                                <!-- Service Card Detail -->
                                <tr>
                                    <td style="padding: 0 40px 32px 40px;">
                                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px;">
                                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                                                <div>
                                                    <h2 style="margin: 0 0 4px 0; font-size: 18px; font-weight: 700; color: #1e293b;">${serviceName}</h2>
                                                    <p style="margin: 0; font-size: 13px; color: #64748b;">${estimate.totalDuration} min estimated duration</p>
                                                </div>
                                                ${frequency ? `
                                                    <span style="background-color: #e0e7ff; color: #4338ca; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">${frequency} Plan</span>
                                                ` : '<span style="background-color: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase;">One-time</span>'}
                                            </div>

                                            <div style="margin-bottom: 24px;">
                                                <h3 style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">What's Included</h3>
                                                <ul style="padding: 0; margin: 0; list-style: none;">
                                                    ${checklistHtml}
                                                </ul>
                                            </div>

                                            ${addons.length > 0 ? `
                                                <div style="border-top: 1px dashed #cbd5e1; padding-top: 20px;">
                                                    <h3 style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">Premium Add-ons</h3>
                                                    <ul style="padding: 0; margin: 0; list-style: none;">
                                                        ${addonsHtml}
                                                    </ul>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>

                                <!-- Financial Summary (Dark Mode Section) -->
                                <tr>
                                    <td style="padding: 40px; background-color: #1e293b; color: white;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding-bottom: 16px; border-bottom: 1px solid #334155;">
                                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                                        <span style="color: #94a3b8; font-size: 14px;">${recurringEstimate ? 'First Visit Total' : 'Total Estimate'}</span>
                                                        <span style="font-size: 24px; font-weight: 800; color: white;">$${estimate.total.toFixed(2)}</span>
                                                    </div>
                                                    ${estimate.discountAmount > 0 ? `
                                                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                                                            <span style="color: #fb7185;">Discount Applied</span>
                                                            <span style="color: #fb7185;">-$${estimate.discountAmount.toFixed(2)}</span>
                                                        </div>
                                                    ` : ''}
                                                </td>
                                            </tr>
                                            ${recurringEstimate ? `
                                                <tr>
                                                    <td style="padding-top: 16px;">
                                                        <div style="display: flex; justify-content: space-between; align-items: center;">
                                                            <div>
                                                                <div style="color: #e2e8f0; font-weight: 600; font-size: 15px;">Recurring Visits (${frequency})</div>
                                                                <div style="color: #6366f1; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-top: 2px;">${recurringServiceName}</div>
                                                            </div>
                                                            <div style="text-align: right;">
                                                                <div style="font-size: 20px; font-weight: 800; color: #818cf8;">$${recurringEstimate.total.toFixed(2)}</div>
                                                                <div style="color: #94a3b8; font-size: 11px;">PER VISIT</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ` : ''}
                                        </table>
                                    </td>
                                </tr>

                                <!-- CTA Section -->
                                ${confirmationUrl ? `
                                    <tr>
                                        <td style="padding: 40px; text-align: center; border-top: 1px solid #f1f5f9;">
                                            <a href="${confirmationUrl}" style="display: inline-block; background-color: #6366f1; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">Confirm Booking</a>
                                            <p style="margin: 16px 0 0 0; color: #94a3b8; font-size: 12px; font-weight: 600;">No payment required today • Secure your slot</p>
                                        </td>
                                    </tr>
                                ` : ''}
                            </table>

                            <!-- Footer -->
                            <table role="presentation" width="100%" maxWidth="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin-top: 32px; text-align: center;">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 8px 0; color: #64748b; font-weight: 700; font-size: 14px;">${profile?.company_name || 'Cleanlydash'}</p>
                                        <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 12px;">
                                            ${profile?.address || ''} • ${profile?.phone_number || ''}<br>
                                            ${profile?.website ? `<a href="${profile.website}" style="color: #6366f1; text-decoration: none;">${profile.website}</a>` : ''}
                                        </p>
                                        <div style="height: 1px; background-color: #e2e8f0; width: 100px; margin: 0 auto 16px auto;"></div>
                                        <p style="margin: 0; color: #cbd5e1; font-size: 11px;">
                                            © ${new Date().getFullYear()} ${profile?.company_name || 'Cleanlydash'}. All rights reserved.<br>
                                            You received this email because you requested a quote.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        // 4. Send Email
        const client = new SmtpClient();
        console.log(`[send_quote_email] Connecting to SMTP: ${smtp.host}:${smtp.port}`);
        await client.connectTLS({
            hostname: smtp.host,
            port: smtp.port,
            username: smtp.username,
            password: smtp.password,
        });

        await client.send({
            from: `"${smtp.from_name}" <${smtp.from_email}>`,
            to: clientEmail,
            subject: `Cleaning Quote: ${serviceName}`,
            content: html,
            html: html,
        });

        await client.close();
        console.log(`[send_quote_email] Email sent successfully to ${clientEmail}`);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (e: any) {
        console.error("[send_quote_email] Error:", e);
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
