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
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization Header');
        }

        // Use Service Role for admin.inviteUserByEmail
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Verify the caller is authenticated
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        // Parse request body
        let requestBody;
        try {
            requestBody = await req.json();
        } catch (e) {
            throw new Error('Invalid Request Body');
        }
        const { email, role, role_id } = requestBody;

        if (!email) {
            throw new Error('Email is required');
        }

        // 5. Determine redirect URL dynamically from platform_settings
        // This allows easy migration from development to production
        const { data: appUrlSetting } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'APP_URL')
            .single();

        // Priority: 1. platform_settings, 2. request origin, 3. fallback
        let baseUrl = appUrlSetting?.value || req.headers.get('origin') || 'http://localhost:5173';
        baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash

        // Fetch tenant slug for branded URL
        const { data: tenantProfile } = await supabaseAdmin
            .from('tenant_profiles')
            .select('slug')
            .eq('id', user.id)
            .single();

        let redirectTo;
        if (tenantProfile && tenantProfile.slug) {
            // New Branded Flow: /:slug/join
            redirectTo = `${baseUrl}/${tenantProfile.slug}/join`;
        } else {
            // Fallback to generic flow
            redirectTo = `${baseUrl}/?invited=true`;
        }

        // 6. Generate a simple invite code as fallback
        const inviteCode = Math.random().toString(36).substring(2, 5).toUpperCase() + '-' +
            Math.random().toString(36).substring(2, 5).toUpperCase() + '-' +
            Math.random().toString(36).substring(2, 5).toUpperCase();

        // Store invite metadata in our table (for role assignment later)
        const { data: inviteRecord, error: insertError } = await supabaseAdmin
            .from('team_invites')
            .insert({
                email: email,
                role: 'staff', // Default enum
                role_id: role_id || null,
                tenant_id: user.id,
                invite_code: inviteCode,
                status: 'pending'
            })
            .select()
            .single();

        if (insertError) {
            console.error("Insert Error:", insertError);
            throw new Error(`Failed to create invite record: ${insertError.message}`);
        }

        // Use Supabase Native Invite
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: redirectTo,
            data: {
                invited_by: user.id,
                role_id: role_id,
                role_name: role,
                tenant_id: user.id
            }
        });

        if (inviteError) {
            console.error("Supabase Invite Error:", inviteError);
            // Don't fail completely - we still have the invite code
            return new Response(
                JSON.stringify({
                    message: 'Email failed, but invite code generated',
                    email_sent: false,
                    invite_code: inviteCode,
                    error: inviteError.message
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200, // Still 200 because we have fallback
                }
            );
        }

        return new Response(
            JSON.stringify({
                message: 'Invite sent successfully!',
                email_sent: true,
                invite_code: inviteCode // Always provide code as backup
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error("Send Invite Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
})
