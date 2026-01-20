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

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get User from Auth Header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error("Missing Authorization Header");

        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (userError || !user) throw new Error("Unauthorized");

        const { session_id, device_fingerprint, device_info } = await req.json();

        if (!session_id || !device_fingerprint) throw new Error("Missing session details");

        // 2. Upsert Current Session (Update 'last_active' if exists)
        const { error: upsertError } = await supabase
            .from('active_sessions')
            .upsert({
                user_id: user.id,
                session_id: session_id,
                device_fingerprint: device_fingerprint,
                device_info: device_info,
                last_active_at: new Date().toISOString()
            }, { onConflict: 'user_id, session_id' });

        if (upsertError) throw upsertError;

        // 3. Enforce Limit (Max 3 - Configure as needed)
        const MAX_SESSIONS = 3;

        const { data: sessions, error: listError } = await supabase
            .from('active_sessions')
            .select('id, last_active_at')
            .eq('user_id', user.id)
            .order('last_active_at', { ascending: false }); // Newest first

        if (listError) throw listError;

        if (sessions && sessions.length > MAX_SESSIONS) {
            // Identify sessions to kill (All after index MAX_SESSIONS-1)
            const sessionsToKill = sessions.slice(MAX_SESSIONS);
            const idsToKill = sessionsToKill.map(s => s.id);

            if (idsToKill.length > 0) {
                console.log(`Revoking ${idsToKill.length} old sessions for user ${user.id}`);
                await supabase
                    .from('active_sessions')
                    .delete()
                    .in('id', idsToKill);

                // Note: We can't revoke the actual JWT easily without Supabase Enterprise 'ban' or short expirations.
                // But the 'active_sessions' table will be the source of truth for the frontend 'SessionManager'.
                // If a client checks 'Am I active?' and sees NO, it self-destructs.
            }
        }

        return new Response(JSON.stringify({ success: true, active_sessions: sessions?.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
})
