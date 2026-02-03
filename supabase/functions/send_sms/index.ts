import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    async function getMasterKey(supabaseAdmin: any) {
        const { data: pKey } = await supabaseAdmin.from('platform_settings').select('value').eq('key', 'TELNYX_API_KEY').maybeSingle();
        const key = pKey?.value || Deno.env.get('TELNYX_MASTER_KEY') || Deno.env.get('TELNYX_API_KEY');
        if (!key) throw new Error("Chave Mestra Telnyx não configurada.");
        return key.trim();
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('Missing Authorization Header');

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
        if (userError || !user) throw new Error('Unauthorized');

        // 1. Resolve Master Key Securely
        const telnyxApiKey = await getMasterKey(supabaseAdmin);

        // 2. Load Tenant Settings
        const { data: settings } = await supabaseAdmin
            .from('telnyx_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!settings?.phone_number) throw new Error("Telefone não configurado para este inquilino.");

        const { to, message, media_urls, sandbox } = await req.json();
        if (!to || !message) throw new Error("Campos 'to' e 'message' são obrigatórios.");

        console.log(`[send_sms] Sending from ${settings.phone_number} to ${to}`);

        // 3. Billing & Quota
        const { data: sub } = await supabaseAdmin.from('tenant_subscriptions').select('plan_id, sms_usage_spend').eq('tenant_id', user.id).single();
        const planId = sub?.plan_id || 'voice_starter';
        const currentSpend = sub?.sms_usage_spend || 0;

        const { data: plan } = await supabaseAdmin.from('plans').select('limits').eq('id', planId).single();
        const { data: priceSetting } = await supabaseAdmin.from('platform_settings').select('value').eq('key', `TELEPHONY_PRICES:${planId}`).maybeSingle();

        let smsPrice = 0.05;
        if (priceSetting) {
            try {
                const parsed = JSON.parse(priceSetting.value);
                smsPrice = parseFloat(parsed.sms || '0.05');
            } catch (e) { }
        }

        const segments = Math.ceil(message.length / 160);
        const messageCost = smsPrice * segments;
        const limits = plan?.limits || {};
        const smsBudget = parseFloat(limits.sms_budget || limits.budget || '37.00');

        if (currentSpend + messageCost > smsBudget) {
            throw new Error("Cota de SMS excedida. Faça upgrade do plano para continuar.");
        }

        if (sandbox) {
            await supabaseAdmin.from('sms_logs').insert({
                tenant_id: user.id, direction: 'outbound', from_number: settings.phone_number,
                to_number: to, content: message, status: 'sent', cost: 0, price: 0
            });
            return new Response(JSON.stringify({ success: true, sandbox: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 4. Real Send with ISOLATION (Messaging Profile ID)
        const response = await fetch('https://api.telnyx.com/v2/messages', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${telnyxApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from: settings.phone_number,
                to: to,
                text: message,
                messaging_profile_id: settings.messaging_profile_id,
                media_urls: media_urls
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.errors?.[0]?.detail || "Erro ao enviar SMS via Telnyx");

        // 5. Success Logging & Billing
        await supabaseAdmin.from('sms_logs').insert({
            tenant_id: user.id, direction: 'outbound', from_number: settings.phone_number,
            to_number: to, content: message, status: 'sent', external_id: data.data?.id,
            cost: messageCost, price: smsPrice
        });

        await supabaseAdmin.rpc('increment_sms_spend', { t_id: user.id, amount: messageCost });

        return new Response(JSON.stringify({ success: true, external_id: data.data?.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error("[send_sms Error]", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
})
})
