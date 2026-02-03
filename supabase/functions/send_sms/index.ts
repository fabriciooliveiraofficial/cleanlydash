
import { serve } from "http/server.ts"
import { createClient } from "@supabase/supabase-js"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    let apiKeySource = 'Initial';
    let redactedKey = 'None';
    let telnyxApiKey: any = null;

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization Header');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) throw new Error('Unauthorized');

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get User's Phone Number
        const { data: settings } = await supabaseAdmin
            .from('telnyx_settings')
            .select('phone_number, api_key, managed_account_id, managed_api_key')
            .eq('user_id', user.id)
            .single();

        if (!settings?.phone_number) {
            throw new Error("You do not have a phone number to send from.");
        }

        // 2. Parse Body
        const { to, message, media_urls, sandbox } = await req.json();

        if (!to || !message) {
            throw new Error("Missing 'to' or 'message' fields.");
        }

        console.log(`Sending SMS from ${settings.phone_number} to ${to} [Sandbox: ${sandbox}]`);

        // 3. Logic
        if (sandbox) {
            // Log to DB only
            await supabaseAdmin.from('sms_logs').insert({
                tenant_id: user.id,
                direction: 'outbound',
                from_number: settings.phone_number,
                to_number: to,
                content: message,
                media_urls: media_urls,
                status: 'sent', // Autocomplete in sandbox
                cost: 0,
                price: 0
            });

            return new Response(
                JSON.stringify({ success: true, message: "SMS sent (Sandbox)", status: "sent" }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );

        } else {
            // Real Send Logic
            telnyxApiKey = Deno.env.get('TELNYX_API_KEY')?.trim() || null;
            apiKeySource = 'Deno Env';

            // Try fetching from user settings first (if they BYOC)
            if (settings.api_key) {
                telnyxApiKey = settings.api_key.trim();
                apiKeySource = 'User Settings (api_key)';
            } else if (settings.managed_api_key) {
                telnyxApiKey = settings.managed_api_key.trim();
                apiKeySource = 'User Settings (managed_api_key)';
            }

            // Fallback to Platform Settings
            if (!telnyxApiKey) {
                const { data } = await supabaseAdmin
                    .from('platform_settings')
                    .select('value')
                    .eq('key', 'TELNYX_API_KEY')
                    .maybeSingle();
                if (data?.value) {
                    telnyxApiKey = data.value.trim();
                    apiKeySource = 'Platform Settings';
                }
            }

            if (!telnyxApiKey) throw new Error("No API Key found for sending SMS.");

            // --- BILLING & QUOTA LOGIC ---
            // 1. Get Tenant Plan & Subscriptions
            const { data: sub } = await supabaseAdmin
                .from('tenant_subscriptions')
                .select('plan_id, sms_usage_spend')
                .eq('tenant_id', user.id)
                .single();

            const planId = sub?.plan_id || 'voice_starter';
            const currentSpend = sub?.sms_usage_spend || 0;

            // 2. Get Plan Limits & Prices
            const { data: plan } = await supabaseAdmin.from('plans').select('limits').eq('id', planId).single();
            const { data: priceSetting } = await supabaseAdmin.from('platform_settings').select('value').eq('key', `TELEPHONY_PRICES:${planId}`).maybeSingle();

            let smsPrice = 0.05; // Fallback
            if (priceSetting) {
                try {
                    const parsed = JSON.parse(priceSetting.value);
                    smsPrice = parseFloat(parsed.sms || '0.05');
                } catch (e) { }
            }

            // Calculate segments (basic estimation: 1 segment = 160 chars)
            const segments = Math.ceil(message.length / 160);
            const messageCost = smsPrice * segments;

            // Get Budget from Plan Limits
            // The user mentioned "minutes" in limits, we'll look for "sms_budget" or use the plan price as the limit
            // Goal: Stop usage when spend reaches plan price (or defined limit)
            const limits = plan?.limits || {};
            const smsBudget = parseFloat(limits.sms_budget || limits.budget || '37.00');

            if (currentSpend + messageCost > smsBudget) {
                console.warn(`[send_sms] Quota Exceeded for ${user.id}: Spend ${currentSpend} + Cost ${messageCost} > Budget ${smsBudget}`);
                throw new Error("Cota de SMS excedida para este plano. Por favor, faça um upgrade para continuar enviando.");
            }
            // --- END BILLING LOGIC ---

            const telnyxUrl = 'https://api.telnyx.com/v2/messages';
            const body: any = {
                from: settings.phone_number,
                to: to,
                text: message
            };

            if (media_urls && Array.isArray(media_urls) && media_urls.length > 0) {
                body.media_urls = media_urls;
            }

            const fetchHeaders: any = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${telnyxApiKey}`
            };

            // White-Label Isolation (Plan B): Link to Messaging Profile (if set)
            // Note: Telnyx uses Messaging Profiles to route webhooks.
            // We already link the number to the profile in buy_number.

            const response = await fetch(telnyxUrl, {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Telnyx SMS Error:", data);
                throw new Error(data.errors?.[0]?.detail || "Failed to send SMS");
            }

            // 3. Update SMS Logs AND Increment Usage Spend
            await supabaseAdmin.from('sms_logs').insert({
                tenant_id: user.id,
                direction: 'outbound',
                from_number: settings.phone_number,
                to_number: to,
                content: message,
                status: 'sent',
                external_id: data.data?.id,
                cost: messageCost,
                price: smsPrice
            });

            // Increment the ledger
            await supabaseAdmin.rpc('increment_sms_spend', {
                t_id: user.id,
                amount: messageCost
            });

            return new Response(
                JSON.stringify({
                    success: true,
                    message: "SMS sent successfully",
                    cost: messageCost,
                    remaining_budget: (smsBudget - (currentSpend + messageCost)).toFixed(2)
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );

        }

    } catch (error: any) {
        console.error("Error in send_sms:", error);

        // Construct debug info
        const debugInfo = {
            message: error.message,
            stack: error.stack,
            apiKeySource: apiKeySource,
            apiKeyPreview: redactedKey,
            apiKeyLength: typeof telnyxApiKey !== 'undefined' ? telnyxApiKey?.length : 0,
            timestamp: new Date().toISOString()
        };

        return new Response(
            JSON.stringify({
                error: `[${apiKeySource}] ${error.message} (Key Length: ${debugInfo.apiKeyLength})`,
                debug: debugInfo
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
