import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // 0. CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.time("Total Execution");

        // Simple Health Check
        if (req.method === 'GET') {
            return new Response(JSON.stringify({ status: 'active', version: '2.0.0' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            });
        }

        // 1. Inputs
        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error("Invalid JSON Body");
        }

        const { email, password, tenant_name, admin_name, phone, plan_id, user_id: existing_id } = body;

        // Validate basic fields
        if (!existing_id && (!email || !password || !plan_id)) {
            throw new Error(`Missing fields: ${!email ? 'email ' : ''}${!password ? 'password ' : ''}${!plan_id ? 'plan_id' : ''}`);
        }

        // 2. Init Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseKey) {
            throw new Error("Server Misconfiguration: Missing Supabase Env Vars");
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        // 3. User Resolution
        let targetUserId = existing_id;
        let targetEmail = email;

        if (!targetUserId) {
            console.time("Create User");

            // Pre-validate uniqueness in tenant_profiles to avoid trigger failures
            // The trigger handle_new_tenant enforces unique phone/email in tenant_profiles
            if (phone) {
                const { data: phoneCheck } = await supabaseAdmin
                    .from('tenant_profiles')
                    .select('id')
                    .eq('phone', phone)
                    .maybeSingle();

                if (phoneCheck) {
                    throw new Error("PHONE_EXISTS");
                }
            }

            // Also check email in tenant_profiles explicitly (redundant but safe)
            const { data: emailCheck } = await supabaseAdmin
                .from('tenant_profiles')
                .select('id')
                .eq('email', email)
                .maybeSingle();

            if (emailCheck) {
                throw new Error("EMAIL_EXISTS");
            }

            // Create User
            const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: false,
                user_metadata: {
                    full_name: admin_name,
                    tenant_name: tenant_name,
                    phone: phone,
                    plan_id: plan_id
                }
            });

            if (createError) {
                console.error("Create User Error:", createError.message, "Code:", createError.status);

                // Check for duplicate email - be VERY specific to avoid false positives
                const errMsg = (createError.message || "").toLowerCase();
                if (errMsg.includes("already registered") || errMsg.includes("already been registered") || errMsg.includes("user already exists")) {
                    throw new Error("EMAIL_EXISTS");
                }

                // Pass through the actual error message for other cases
                throw new Error(createError.message || "Failed to create user");
            }

            targetUserId = userData.user.id;
            console.timeEnd("Create User");

            // 3b. Create user_roles entry (triggers don't fire for admin.createUser!)
            console.time("Setup User Role & Tenant");
            try {
                // Insert into user_roles with property_owner role
                await supabaseAdmin.from('user_roles').insert({
                    user_id: targetUserId,
                    role: 'property_owner'
                });

                // Generate tenant slug
                const baseSlug = (tenant_name || 'tenant').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/--+/g, '-');
                const suffix = Math.random().toString(36).substring(2, 6);
                const finalSlug = `${baseSlug}-${suffix}`;

                // Insert into tenant_profiles
                await supabaseAdmin.from('tenant_profiles').insert({
                    id: targetUserId,
                    slug: finalSlug,
                    name: tenant_name || 'New Company'
                });

                console.log("User role and tenant profile created for:", targetUserId);
            } catch (roleErr: any) {
                console.error("Role/Tenant Setup Error (Non-Fatal):", roleErr.message);
                // Continue anyway - user can still be set up manually
            }
            console.timeEnd("Setup User Role & Tenant");

            // 3c. Send Verification Email via Resend
            try {
                // We use auth.resend() to trigger the actual email.
                await supabaseAdmin.auth.resend({
                    type: 'signup',
                    email: email,
                    options: {
                        emailRedirectTo: `${req.headers.get('origin')}/auth?mode=login`
                    }
                });
            } catch (ignored) {
                console.error("Email Resend Failed (Non-Fatal):", ignored);
            }
        }

        // 4. Config & Stripe
        let stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
        if (!stripeKey) {
            const { data } = await supabaseAdmin.from('platform_settings').select('value').eq('key', 'STRIPE_SECRET_KEY').maybeSingle();
            stripeKey = data?.value;
        }

        if (!stripeKey) throw new Error("Server Misconfiguration: Stripe Key Missing");

        const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16', httpClient: Stripe.createFetchHttpClient() });

        // 5. Plan Lookup
        let priceAmount = 0;
        let productName = 'Plan';

        const { data: plan } = await supabaseAdmin.from('plans').select('*').eq('id', plan_id).maybeSingle();
        if (plan) {
            priceAmount = plan.price_monthly_usd * 100;
            productName = plan.name;
        } else {
            const { data: combo } = await supabaseAdmin.from('combos').select('*').eq('id', plan_id).maybeSingle();
            if (combo) {
                priceAmount = combo.price_monthly_usd * 100;
                productName = combo.name;
            } else {
                throw new Error("Invalid Plan ID: " + plan_id);
            }
        }

        // 6. Create Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: targetEmail,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: productName,
                        description: `Subscription for ${tenant_name || 'New Tenant'}`,
                        metadata: { tenant_id: targetUserId, plan_id: plan_id }
                    },
                    unit_amount: Math.round(priceAmount),
                    recurring: { interval: 'month' },
                },
                quantity: 1,
            }],
            subscription_data: {
                trial_period_days: 30,
                metadata: { tenant_id: targetUserId, user_id: targetUserId }
            },
            payment_method_collection: 'always',
            success_url: `${req.headers.get('origin')}/auth?mode=verify&checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/auth?canceled=true`,
            metadata: { tenant_id: targetUserId, user_id: targetUserId, plan_id: plan_id }
        });

        console.timeEnd("Total Execution");

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error: any) {
        console.error("Exec Error:", error);

        // Return clear JSON error
        return new Response(JSON.stringify({
            error: error.message || "Unknown Error",
            details: error.stack || "No stack trace"
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
