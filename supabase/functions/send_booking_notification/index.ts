// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

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
    console.log(`${req.method} request received`);
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { booking_id } = await req.json();
        if (!booking_id) throw new Error("Missing booking_id");

        // 1. Fetch Booking and Context
        const { data: booking, error: bError } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                customer:customers(name, email, phone),
                service:services(name),
                staff:team_members!bookings_assigned_to_fkey(name, email, role_id)
            `)
            .eq('id', booking_id)
            .single();

        if (bError || !booking) throw new Error("Booking not found");

        const results: Record<string, string> = { email: 'skipped', sms: 'skipped' };

        // 2. Fetch Settings
        const { data: smtp } = await supabaseAdmin
            .from('smtp_settings')
            .eq('user_id', booking.tenant_id)
            .eq('is_active', true)
            .maybeSingle();

        // 3. Handle Client Notifications (Email)
        if ((booking.notify_client === 'email' || booking.notify_client === 'both') && booking.customer?.email && smtp) {
            try {
                const client = new SmtpClient();
                await client.connectTLS({
                    hostname: smtp.host,
                    port: smtp.port,
                    username: smtp.username,
                    password: smtp.password,
                });

                await client.send({
                    from: `"${smtp.from_name}" <${smtp.from_email}>`,
                    to: booking.customer.email,
                    subject: `Confirmação de Agendamento: ${booking.service?.name || 'Serviço'}`,
                    content: `Olá ${booking.customer.name},\n\nSeu agendamento para ${booking.service?.name} foi confirmado para o dia ${new Date(booking.start_date).toLocaleString('pt-BR')}.\n\nObrigado!`,
                });
                await client.close();
                results.email = 'sent';
            } catch (e) {
                console.error("SMTP Error (Client):", e);
                results.email = `error: ${e.message}`;
            }
        }

        // 4. Handle Staff Notifications (Email)
        if ((booking.notify_staff === 'email' || booking.notify_staff === 'both') && booking.staff?.email && smtp) {
            try {
                const client = new SmtpClient();
                await client.connectTLS({
                    hostname: smtp.host,
                    port: smtp.port,
                    username: smtp.username,
                    password: smtp.password,
                });

                await client.send({
                    from: `"${smtp.from_name}" <${smtp.from_email}>`,
                    to: booking.staff.email,
                    subject: `Novo Trabalho Atribuído: ${booking.service?.name || 'Limpeza'}`,
                    content: `Olá ${booking.staff.name},\n\nUm novo trabalho foi atribuído a você: ${booking.service?.name}.\nData: ${new Date(booking.start_date).toLocaleString('pt-BR')}\nCliente: ${booking.customer?.name || 'N/A'}\nEndereço: ${booking.customer?.address || 'Ver no App'}\n\nAbra o app do cleaner para confirmar.`,
                });
                await client.close();
                results.staff_email = 'sent';
            } catch (e) {
                console.error("SMTP Error (Staff):", e);
                results.staff_email = `error: ${e.message}`;
            }
        }

        // 5. Handle Staff Push Notifications
        if (booking.assigned_to) {
            const { data: subs } = await supabaseAdmin
                .from('push_subscriptions')
                .select('subscription_json')
                .eq('user_id', booking.assigned_to);

            if (subs && subs.length > 0) {
                // Background: Send Web Push (Requires VAPID keys in Env)
                const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
                const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
                const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'admin@cleanlydash.com';

                if (vapidPublic && vapidPrivate) {
                    try {
                        const { default: webpush } = await import("https://esm.sh/web-push@3.6.6");
                        webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

                        for (const sub of subs) {
                            try {
                                await webpush.sendNotification(sub.subscription_json, JSON.stringify({
                                    title: "Nova Atribuição!",
                                    body: `Você foi escalado para: ${booking.service?.name || 'Limpeza'}`,
                                    url: "/cleaner"
                                }));
                            } catch (err) {
                                console.error("Push delivery fail:", err);
                            }
                        }
                        results.push = `Sent to ${subs.length} devices`;
                    } catch (e) {
                        console.error("WebPush Error:", e);
                        results.push = `error: ${e.message}`;
                    }
                } else {
                    results.push = `skipped: missing VAPID keys in Env`;
                }

                // Track in history
                await supabaseAdmin.from('notification_history').insert({
                    booking_id: booking.id,
                    user_id: booking.assigned_to,
                    type: 'push',
                    status: results.push === 'sent' ? 'sent' : 'failed',
                    tenant_id: booking.tenant_id
                });
            }
        }

        // TODO: Implement SMS via Telnyx if requested
        if ((booking.notify_client === 'sms' || booking.notify_client === 'both') && booking.customer?.phone) {
            results.sms = 'pending implementation (Telnyx API needed)';
        }

        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
