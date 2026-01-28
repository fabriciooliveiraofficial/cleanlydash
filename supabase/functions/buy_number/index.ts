
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

    let diag: any = { stage: "start" };

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            diag.error = "Missing Authorization Header";
            throw new Error(diag.error);
        }

        diag.auth_header_start = authHeader.substring(0, 15) + "...";
        const token = authHeader.replace('Bearer ', '');
        diag.token_len = token.length;
        diag.token_hint = token.substring(0, 10) + "..." + token.substring(token.length - 10);

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
        if (userError || !user) {
            diag.auth_error = userError?.message || "User not found";
            diag.auth_status = userError?.status || 401;
            console.error("Auth failed:", diag.auth_error);
            return new Response(JSON.stringify({
                error: "Unauthorized: " + diag.auth_error,
                debug: diag
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401
            });
        }

        diag.user_id = user.id;

        const { phone_number, sandbox } = await req.json();

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Resolve Key (Priority: Database Platform Settings -> System Env -> User Settings)
        let telnyxApiKey: string | undefined = undefined;

        // 1. FIRST: Try Platform Settings (Admin-configured key in DB)
        const { data: platformKeyData, error: platformKeyError } = await supabaseAdmin
            .from('platform_settings')
            .select('value, created_at')
            .eq('key', 'TELNYX_API_KEY')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        diag.platform_query_error = platformKeyError?.message;
        diag.platform_key_found = !!platformKeyData?.value;

        if (platformKeyData?.value && platformKeyData.value.length > 20) {
            telnyxApiKey = platformKeyData.value.trim();
            diag.resolved_from = "platform_settings_db";
        }

        // 2. FALLBACK: Try Environment Variables
        if (!telnyxApiKey || telnyxApiKey.length < 20) {
            const envKey = Deno.env.get('TELNYX_MASTER_KEY') || Deno.env.get('TELNYX_API_KEY');
            if (envKey && envKey.length > 20) {
                telnyxApiKey = envKey;
                diag.resolved_from = "environment_variable";
            }
        }

        // 2. Fallback to User Settings (Legacy/BYO)
        if (!telnyxApiKey || telnyxApiKey.length < 20) {
            const { data: settings } = await supabaseAdmin.from('telnyx_settings').select('*');
            const myRow = settings?.find(s => s.user_id === user.id);
            const fallbackRow = settings?.find(s => s.api_key || s.managed_api_key);
            const targetRow = myRow || fallbackRow;

            if (targetRow) {
                if (targetRow.api_key && targetRow.api_key.length > 20) {
                    telnyxApiKey = targetRow.api_key.trim();
                    diag.resolved_from = "row_api_key";
                } else if (targetRow.managed_api_key && targetRow.managed_api_key.length > 20) {
                    telnyxApiKey = targetRow.managed_api_key.trim();
                    diag.resolved_from = "row_managed_key";
                }
            }
        }

        if (telnyxApiKey) {
            diag.key_fingerprint = telnyxApiKey.substring(0, 5) + "...";
        }

        if (sandbox || !telnyxApiKey || telnyxApiKey.length < 20) {
            return new Response(JSON.stringify({ success: true, message: "Purchase simulated (Sandbox/No Key)", debug: diag }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Step 1: Reserve the number first
        diag.step = "reserving";
        const reserveResponse = await fetch(`https://api.telnyx.com/v2/number_reservations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${telnyxApiKey}`
            },
            body: JSON.stringify({
                phone_numbers: [{ phone_number: phone_number }]
            })
        });

        const reserveData = await reserveResponse.json();
        diag.reservation_response_status = reserveResponse.status;
        let reservationId = reserveData?.data?.id;

        // If reservation fails, log it
        if (!reserveResponse.ok) {
            const errorMsg = reserveData?.errors?.[0]?.detail || 'Reservation failed';
            diag.reservation_failed = errorMsg;
            diag.step = "direct_order_fallback";

            // If 403 (Account Level Issue), abort immediately
            if (reserveResponse.status === 403) {
                return new Response(JSON.stringify({
                    error: "Telnyx Account Error: " + errorMsg,
                    debug: diag,
                    telnyx_error: reserveData
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
            }
        } else {
            diag.reservation_id = reservationId;
        }

        // Step 2: Create Number Order
        diag.step = "ordering";
        const orderBody: any = {
            phone_numbers: [{ phone_number: phone_number }]
        };

        if (reservationId) {
            orderBody.phone_number_reservation_id = reservationId;
        }

        const response = await fetch(`https://api.telnyx.com/v2/number_orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${telnyxApiKey}`
            },
            body: JSON.stringify(orderBody)
        });

        const resultData = await response.json();
        diag.order_response_status = response.status;

        if (!response.ok) {
            return new Response(JSON.stringify({
                error: resultData?.errors?.[0]?.detail || 'Purchase failed',
                debug: diag,
                telnyx_error: resultData
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
        }

        return new Response(JSON.stringify({ success: true, data: resultData, debug: diag }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message, debug: diag }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }
})
