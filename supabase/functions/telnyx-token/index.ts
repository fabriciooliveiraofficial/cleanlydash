
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')!;
        console.log("Authorization Header Present:", !!authHeader);

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const tokenStr = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(tokenStr);

        if (!user) {
            return new Response("Unauthorized", { status: 401, headers: corsHeaders })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Check for individual settings (Absolute requirement for isolation)
        const { data: userSettings } = await supabaseAdmin
            .from('telnyx_settings')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

        const login = userSettings?.sip_username;
        const password = userSettings?.sip_password;
        const callerId = userSettings?.phone_number;

        // --- VOICE BUDGET CHECK ---
        const { data: sub } = await supabaseAdmin
            .from('tenant_subscriptions')
            .select('plan_id, voice_usage_spend')
            .eq('tenant_id', user.id)
            .single();

        const planId = sub?.plan_id || 'voice_starter';
        const currentVoiceSpend = sub?.voice_usage_spend || 0;

        // Get Plan Limits
        const { data: plan } = await supabaseAdmin.from('plans').select('limits').eq('id', planId).single();
        const limits = plan?.limits || {};

        // Budget calculation
        const voiceBudget = parseFloat(limits.voice_budget || limits.budget || '37.00');

        if (currentVoiceSpend >= voiceBudget) {
            console.warn(`[telnyx-token] Voice Quota Exceeded for ${user.id}: Spend ${currentVoiceSpend} >= Budget ${voiceBudget}`);
            return new Response(JSON.stringify({
                error: 'Cota de voz excedida',
                details: 'Seu limite de chamadas para este ciclo foi atingido.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            });
        }
        // --- END BUDGET CHECK ---

        if (!login || !password) {
            console.error("Missing User SIP credentials", { user_id: user.id });
            return new Response(JSON.stringify({
                error: 'Telefonia não configurada',
                details: 'Por favor, adquira um número ou provisione sua conta para ativar a voz.'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 403,
            })
        }

        console.log(`Returning ISOLATED SIP credentials for user: ${user.id}`);

        return new Response(
            JSON.stringify({
                authType: 'sip_credentials',
                login: login,
                password: password,
                callerId: callerId || ''
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error("Error in telnyx-token:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
})
