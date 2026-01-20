import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { create, verify, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Use a fallback secret for JWS if env not set (Ensure this is set in prod!)
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET') || 'super-secret-invite-key-change-me';
const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign", "verify"],
);

serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // =================================================================
        // GET: BURN-ON-READ & SIGN (Handover Phase)
        // =================================================================
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const token = url.searchParams.get('token');

            if (!token) throw new Error("Token obrigatório.");

            // 1. Validate Token (Must be pending)
            const { data: invite, error: inviteError } = await supabaseAdmin
                .from('team_invites')
                .select('*')
                .eq('token', token)
                .eq('status', 'pending')
                .single();

            if (inviteError || !invite) {
                // Return 404/410 to indicate "Used or Invalid"
                return new Response(JSON.stringify({ error: 'O link de convite expirou ou já foi usado.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                });
            }

            // 2. BURN IT! (Mark consumed immediately)
            const { error: burnError } = await supabaseAdmin
                .from('team_invites')
                .update({ status: 'consumed', updated_at: new Date().toISOString() })
                .eq('id', invite.id);

            if (burnError) {
                console.error("Burn Error:", burnError);
                throw new Error("Erro ao processar convite.");
            }

            // 3. Generate JWS (Temporary Secure Token)
            // Valid for 1 hour to allow user to fill registration form
            const jwtPayload = {
                invite_id: invite.id,
                email: invite.email,
                role: invite.role, // Legacy fallback
                role_id: invite.role_id, // Custom Role
                tenant_id: invite.tenant_id,
                exp: getNumericDate(60 * 60), // 1 hour expiration
            };

            const jws = await create({ alg: "HS512", typ: "JWT" }, jwtPayload, key);

            return new Response(JSON.stringify({
                secure_token: jws,
                email: invite.email,
                role: invite.role
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        // =================================================================
        // POST: VERIFY & CREATE (Completion Phase)
        // =================================================================
        if (req.method === 'POST') {
            const { secure_token, password, full_name } = await req.json();

            if (!secure_token) throw new Error("Token de segurança ausente.");
            if (!password || password.length < 6) throw new Error("Senha inválida (min 6 caracteres).");

            // 1. Verify JWS
            let payload;
            try {
                payload = await verify(secure_token, key);
            } catch (e) {
                throw new Error("Sessão de convite expirada. Solicite um novo convite.");
            }

            const { email, tenant_id, role_id, role } = payload;

            // 2. Create or Link User
            // Check if user exists first
            const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
            // Note: listUsers is inefficient for scale, better try createUser and catch error, or list by email if supported
            // Better: Try to create user. if fails (active), try to link.

            let userId;
            let finalUser;

            // Try creating user (Auto-confirm email for invite flow)
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email as string,
                password: password,
                email_confirm: true,
                user_metadata: { full_name: full_name || 'Membro' }
            });

            if (createError) {
                // User might already exist?
                // If "User already registered", we proceed to link permissions.
                // But for "One Click" flow, we might want to just Sign In?
                // The PLAN says "Registration". If user exists, we might need to verify password.
                // BUT, the simplified plan implies new users mostly.
                // Let's assume we proceed if user exists using 'listUsers' or specific fetch to get ID.
                // Actually, listUsers() is bad. Let's try `getUserByEmail`? No such method on admin.
                // We will rely on signing in to verify identity if they exist, OR just linking if we trust the invite email owner.
                // STRICT SECURITY: We should NOT link blindly if user exists unless they prove ownership (Password).

                // Attempt Sign In to validate (since we have password from form)
                const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                    email: email as string,
                    password: password
                });

                if (signInError) {
                    throw new Error("Usuário já existe. A senha fornecida está incorreta.");
                }
                userId = signInData.user.id;
                finalUser = signInData.user;
            } else {
                userId = newUser.user.id;
                finalUser = newUser.user;
            }

            // 3. Assign Permission
            const memberPayload: any = {
                user_id: userId,
                tenant_id: tenant_id,
                email: email,
                name: full_name || finalUser.user_metadata?.full_name || 'Novo Membro',
                status: 'active',
                role: role || 'staff' // Legacy
            };
            if (role_id) memberPayload.role_id = role_id;

            const { error: linkError } = await supabaseAdmin
                .from('team_members')
                .upsert(memberPayload, { onConflict: 'user_id, tenant_id' });

            if (linkError) throw new Error("Falha ao vincular membro: " + linkError.message);

            // 4. Return Valid Session (So frontend can log them in immediately)
            // We need to generate a session for the client.
            // Since we might have created the user via Admin, we need to sign them in effectively.
            // If we already signed in (existing user), we have session.
            // If new user, createSession?

            // Simplest: Just use signInWithPassword again (even for new user) to get fresh session tokens
            const { data: sessionData, error: sessionError } = await createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '' // Use Anon for public sign-in
            ).auth.signInWithPassword({
                email: email as string,
                password: password
            });

            if (sessionError) throw sessionError;

            return new Response(JSON.stringify({
                session: sessionData.session,
                role: role
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        throw new Error("Method not allowed");

    } catch (error: any) {
        console.error("Invite Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
})
