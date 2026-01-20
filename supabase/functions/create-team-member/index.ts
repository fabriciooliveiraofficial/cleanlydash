import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate a secure temporary password
function generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const special = '@#$!';
    let password = '';

    // 8 random chars
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Add 1 special char
    password += special.charAt(Math.floor(Math.random() * special.length));

    // Add 2 numbers
    password += Math.floor(Math.random() * 90 + 10);

    return password;
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

        // Admin client for creating users
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Client to verify caller
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser(token);

        if (userError || !caller) {
            throw new Error('Unauthorized');
        }

        // Parse request body
        const { name, email, phone, role_id } = await req.json();

        if (!email || !name) {
            throw new Error('Email and name are required');
        }

        // Generate temporary password
        const tempPassword = generateTempPassword();

        // 1. Create user in Supabase Auth
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true, // Auto-confirm email
            user_metadata: {
                full_name: name,
                phone: phone,
                invited_by: caller.id,
                must_change_password: true
            }
        });

        if (createError) {
            console.error("Create User Error:", createError);
            // Check for duplicate email
            if (createError.message?.includes('already been registered') ||
                createError.message?.includes('already exists') ||
                createError.message?.includes('duplicate')) {
                throw new Error('Este email já está cadastrado. Por favor, use outro email.');
            }
            throw new Error(createError.message || 'Erro ao criar usuário');
        }

        if (!newUser.user) {
            throw new Error('Failed to create user');
        }

        // Fetch role name if role_id is provided
        let roleName = 'staff';
        if (role_id) {
            const { data: roleData } = await supabaseAdmin
                .from('custom_roles')
                .select('name, app_access')
                .eq('id', role_id)
                .single();

            if (roleData) {
                // Priority: Use app_access configuration
                if (roleData.app_access === 'cleaner_app') {
                    roleName = 'cleaner';
                } else if (roleData.app_access === 'dashboard') {
                    roleName = 'staff';
                } else {
                    // Fallback heuristics
                    const normalizedName = roleData.name.toLowerCase();
                    if (normalizedName.includes('cleaner') || normalizedName.includes('faxin')) {
                        roleName = 'cleaner';
                    }
                }
            }
        }

        // 2. Link to team_members table
        const teamMemberData: any = {
            user_id: newUser.user.id,
            tenant_id: caller.id,
            email: email,
            name: name,
            phone: phone || null,
            role_id: role_id || null,
            role: roleName,
            status: 'active'
        };

        const { error: linkError } = await supabaseAdmin
            .from('team_members')
            .insert(teamMemberData);

        if (linkError) {
            console.error("Link Error:", linkError);
            // If linking fails, we must inform the user, otherwise they get a broken account
            // Ideally we should rollback auth user, but for now just throw
            throw new Error(`Erro ao vincular membro: ${linkError.message}`);
        }

        // 3. Get APP_URL for the response
        const { data: appUrlSetting } = await supabaseAdmin
            .from('platform_settings')
            .select('value')
            .eq('key', 'APP_URL')
            .single();

        const appUrl = appUrlSetting?.value || 'http://localhost:5173';

        return new Response(
            JSON.stringify({
                success: true,
                user_id: newUser.user.id,
                credentials: {
                    app_url: appUrl,
                    email: email,
                    password: tempPassword,
                    expires_in: '48 horas'
                },
                message: 'Membro criado com sucesso!'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        );

    } catch (error: any) {
        console.error("Create Team Member Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        );
    }
})
