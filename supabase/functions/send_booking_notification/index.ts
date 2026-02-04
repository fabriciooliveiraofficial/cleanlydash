// @ts-nocheck
import { serve } from "http/server.ts"
import { createClient } from "@supabase/supabase-js"
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
    console.log(`${req.method} request received`);
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Payload can now include 'image' URL from client
        const { booking_id, event_type = 'new_booking', image_url } = await req.json();
        if (!booking_id) throw new Error("Missing booking_id");

        console.log(`[Notification] Processing '${event_type}' for booking ${booking_id}`);

        // 1. Fetch Booking and Context
        const { data: booking, error: bError } = await supabaseAdmin
            .from('bookings')
            .select(`
                *,
                customer:customers(name, email, phone, address),
                service:services(name),
                staff:team_members!bookings_assigned_to_fkey(name, email, role_id)
            `)
            .eq('id', booking_id)
            .single();

        if (bError || !booking) throw new Error("Booking not found");

        // 2. Fetch Tenant Notification Settings
        const { data: settings } = await supabaseAdmin
            .from('tenant_notification_settings')
            .eq('tenant_id', booking.tenant_id)
            .maybeSingle();

        // 3. Global Gate: specific event enabled?
        const eventEnabled = settings?.events?.[event_type] ?? true;

        if (!eventEnabled) {
            console.log(`[Notification] Skipped: Event '${event_type}' is disabled in settings.`);
            return new Response(JSON.stringify({ success: true, skipped: true, reason: 'disabled_in_settings' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 3b. Determine Push Type configuration for this event
        const pushType = settings?.push_config?.[event_type] || 'standard';
        console.log(`[Notification] Push Configuration for '${event_type}': ${pushType}`);

        const results: Record<string, string> = { email: 'skipped', sms: 'skipped', push: 'skipped' };

        const { data: smtp } = await supabaseAdmin
            .from('smtp_settings')
            .eq('user_id', booking.tenant_id)
            .eq('is_active', true)
            .maybeSingle();

        // 2b. Fetch Tenant Timezone
        const { data: profile } = await supabaseAdmin
            .from('tenant_profiles')
            .select('timezone')
            .eq('tenant_id', booking.tenant_id)
            .maybeSingle();

        const timezone = profile?.timezone || 'UTC';

        const formatZonedDate = (dateStr: string) => {
            return new Date(dateStr).toLocaleString('pt-BR', {
                timeZone: timezone,
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const formatZonedTime = (dateStr: string) => {
            return new Date(dateStr).toLocaleString('pt-BR', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // HELPER: Send Web Push
        const sendPush = async (userId: string, title: string, body: string, url: string, type: string, extraImage?: string) => {
            const { data: subs } = await supabaseAdmin
                .from('push_subscriptions')
                .select('endpoint, p256dh, auth')
                .eq('user_id', userId);

            if (!subs || subs.length === 0) return 'no_subscriptions';

            const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
            const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
            const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'admin@cleanlydash.com';

            if (!vapidPublic || !vapidPrivate) return 'missing_vapid_keys';

            try {
                const { default: webpush } = await import("npm:web-push@3.6.6");
                webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);

                // Construct Payload based on Type
                const payloadObj: any = {
                    title,
                    body,
                    url,
                    bookingId: booking.id,
                    timestamp: Date.now()
                };

                // Rich Media
                if (type === 'rich' && (extraImage || image_url)) {
                    // Prefer event-provided image, fallback to generic if specific logic added later
                    payloadObj.image = extraImage || image_url || "https://images.unsplash.com/photo-1581578731117-104f2a8d23e9?w=800&q=80";
                }

                // Interactive
                if (type === 'interactive') {
                    payloadObj.actions = [
                        { action: 'open', title: 'Ver Detalhes' },
                        { action: 'call', title: 'Ligar' } // Frontend must handle 'call'
                    ];
                }

                const notificationPayload = JSON.stringify(payloadObj);

                for (const sub of subs) {
                    try {
                        await webpush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: { p256dh: sub.p256dh, auth: sub.auth }
                        }, notificationPayload);
                    } catch (err: any) {
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
                        }
                    }
                }
                return `Sent to ${subs.length} devices`;
            } catch (e: any) { return `error: ${e.message}`; }
        };

        // =================================================================================
        // LOGIC: NEW_BOOKING (Confirmations to Client/Staff)
        // =================================================================================
        if (event_type === 'new_booking') {

            // 3. Handle Client Notifications (Email)
            if (settings?.email_enabled && (booking.notify_client === 'email' || booking.notify_client === 'both') && booking.customer?.email && smtp) {
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
                        content: `Olá ${booking.customer.name},\n\nSeu agendamento para ${booking.service?.name} foi confirmado para o dia ${formatZonedDate(booking.start_date)}.\n\nObrigado!`,
                    });
                    await client.close();
                    results.email = 'sent';
                } catch (e) {
                    console.error("SMTP Error (Client):", e);
                    results.email = `error: ${e.message}`;
                }
            }

            // 4. Handle Staff Notifications (Email)
            if (settings?.email_enabled && (booking.notify_staff === 'email' || booking.notify_staff === 'both') && booking.staff?.email && smtp) {
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
                        content: `Olá ${booking.staff.name},\n\nUm novo trabalho foi atribuído a você: ${booking.service?.name}.\nData: ${formatZonedDate(booking.start_date)}\nCliente: ${booking.customer?.name || 'N/A'}\nEndereço: ${booking.customer?.address || 'Ver no App'}\n\nAbra o app do cleaner para confirmar.`,
                    });
                    await client.close();
                    results.staff_email = 'sent';
                } catch (e) {
                    console.error("SMTP Error (Staff):", e);
                    results.staff_email = `error: ${e.message}`;
                }
            }

            // 5. Handle Staff Push Notifications
            if (settings?.push_enabled && booking.assigned_to) {
                // Use new helper with type config
                const pushMsg = await sendPush(
                    booking.assigned_to,
                    "Nova Atribuição! 🧹",
                    `Você foi escalado para: ${booking.service?.name}`,
                    "/cleaner",
                    pushType // Use configured type
                );
                results.push = pushMsg;
            }
        }

        // =================================================================================
        // LOGIC: CHECK_IN (Notify Admin)
        // =================================================================================
        if (event_type === 'check_in') {
            const adminEmails = settings?.recipients?.emails || [];

            // Email Admin
            if (settings?.email_enabled && adminEmails.length > 0 && smtp) {
                try {
                    const client = new SmtpClient();
                    await client.connectTLS({ hostname: smtp.host, port: smtp.port, username: smtp.username, password: smtp.password });

                    for (const email of adminEmails) {
                        await client.send({
                            from: `"${smtp.from_name}" <${smtp.from_email}>`,
                            to: email,
                            subject: `📍 Check-in realizado: ${booking.service?.name}`,
                            content: `O Cleaner ${booking.staff?.name || 'Staff'} realizou o check-in.\n\nCliente: ${booking.customer?.name} \nHorário: ${formatZonedTime(new Date().toISOString())}`,
                        });
                    }
                    await client.close();
                    results.admin_email = `Sent to ${adminEmails.length} admins`;
                } catch (e) { results.admin_email = `error: ${e.message}`; }
            }

            // PUSH to Admin (Owner)
            const { data: admins } = await supabaseAdmin
                .from('team_members')
                .select('user_id')
                .eq('tenant_id', booking.tenant_id)
                .in('role', ['owner', 'admin']);

            if (settings?.push_enabled && admins) {
                for (const admin of admins) {
                    if (admin.user_id) {
                        await sendPush(
                            admin.user_id,
                            `📍 Check-in: ${booking.staff?.name}`,
                            `${booking.customer?.name} - ${formatZonedTime(new Date().toISOString())}`,
                            `/bookings/${booking.id}`,
                            pushType,
                            // Map image for Rich Push
                            "https://img.icons8.com/color/480/map-pin.png"
                        );
                    }
                }
                results.push_admin = `Sent to ${admins ? admins.length : 0} admins`;
            }
        }

        // =================================================================================
        // LOGIC: COMPLETED (Notify Admin + Customer)
        // =================================================================================
        if (event_type === 'completed') {
            const adminEmails = settings?.recipients?.emails || [];

            // Notify Admin Email
            if (settings?.email_enabled && adminEmails.length > 0 && smtp) {
                try {
                    const client = new SmtpClient();
                    await client.connectTLS({ hostname: smtp.host, port: smtp.port, username: smtp.username, password: smtp.password });

                    for (const email of adminEmails) {
                        await client.send({
                            from: `"${smtp.from_name}" <${smtp.from_email}>`,
                            to: email,
                            subject: `✅ Serviço Concluído: ${booking.service?.name}`,
                            content: `O serviço foi finalizado com sucesso.\n\nCliente: ${booking.customer?.name}\nCleaner: ${booking.staff?.name}\n\nUma fatura rascunho foi gerada automaticamente.`,
                        });
                    }
                    await client.close();
                } catch (e) { console.error(e); }
            }

            // PUSH to Admin
            const { data: admins } = await supabaseAdmin
                .from('team_members')
                .select('user_id')
                .eq('tenant_id', booking.tenant_id)
                .in('role', ['owner', 'admin']);

            if (settings?.push_enabled && admins) {
                for (const admin of admins) {
                    if (admin.user_id) {
                        await sendPush(
                            admin.user_id,
                            `✅ Serviço Concluído!`,
                            `${booking.staff?.name} finalizou ${booking.service?.name}.`,
                            `/bookings/${booking.id}`,
                            pushType,
                            image_url // Pass the photo from Cleaner App
                        );
                    }
                }
                results.push_admin = `Sent to ${admins ? admins.length : 0} admins`;
            }

            // Notify Customer (Optional: Survey/Thanks) - Omitted
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
