import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
    // 0. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const payload = await req.json()
        const { user_id, title, body, url, image, actions, tag, category } = payload

        console.log(`[Push] Sending to user: ${user_id}`, payload)

        // 1. Initialize Supabase Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Fetch VAPID keys from Env
        const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')
        const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
        const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:support@airgoverness.com'

        if (!vapidPublic || !vapidPrivate) {
            console.error('[Push] Missing VAPID keys in environment')
            throw new Error('Push configuration missing')
        }

        // 3. Fetch all active subscriptions for this user
        const { data: subscriptions, error: subError } = await supabaseAdmin
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', user_id)

        if (subError) throw subError

        if (!subscriptions || subscriptions.length === 0) {
            console.log(`[Push] No subscriptions for user ${user_id}`)
            return new Response(JSON.stringify({ success: true, message: 'No active subscriptions found' }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
        }

        // 4. Import web-push dynamically to avoid top-level issues
        const { default: webpush } = await import("npm:web-push")
        webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)

        const results = []

        // 5. Send notification to each device
        for (const sub of subscriptions) {
            const pushConfig = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            }

            try {
                await webpush.sendNotification(
                    pushConfig,
                    JSON.stringify({
                        title,
                        body,
                        image: image || undefined, // Rich media
                        actions: actions || [],     // Action buttons
                        tag: tag || category || 'general', // Collapsing
                        data: {
                            url: url || '/',
                            notification_id: crypto.randomUUID()
                        },
                    })
                )
                results.push({ endpoint: sub.endpoint, status: 'success' })
            } catch (err: any) {
                console.error(`[Push] Error sending to ${sub.endpoint}:`, err)
                // If subscription is expired/invalid, remove it
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await supabaseAdmin
                        .from('push_subscriptions')
                        .delete()
                        .eq('id', sub.id)
                }
                results.push({ endpoint: sub.endpoint, status: 'failed', error: err.message })
            }
        }

        // 6. Record in history
        await supabaseAdmin.from('notification_history').insert({
            user_id,
            title,
            body,
            category: category || 'general',
            data: { url, image, actions, tag }
        })

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })

    } catch (error: any) {
        console.error('[Push] Fatal error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
})

