
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization Header');
        }

        // Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        // Verify User
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Unauthorized: ' + (userError?.message || 'No user'));
        }

        // Parse Request Body for Filters
        const { country_code, state, city, area_code, sandbox } = await req.json();

        if (!country_code) {
            throw new Error('Country code is required');
        }

        const telnyxApiKey = Deno.env.get('TELNYX_MASTER_KEY');

        // MOCK / SANDBOX FALLBACK
        if (sandbox || !telnyxApiKey) {
            console.log("Returning MOCK numbers (Sandbox/NoKey mode)");
            const mockNumbers = [];
            const count = 5;
            for (let i = 0; i < count; i++) {
                const random = Math.floor(Math.random() * 10000);
                let num = '';
                let region = '';
                let ndc = '';

                if (country_code === 'BR') {
                    ndc = area_code || '11';
                    num = `+55${ndc}9${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
                    region = state || 'SP';
                } else {
                    // Default US
                    ndc = area_code || '212';
                    num = `+1${ndc}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
                    region = state || 'NY';
                }

                mockNumbers.push({
                    phone_number: num,
                    national_destination_code: ndc,
                    region_information: {
                        region_name: region,
                        region_code: region
                    },
                    cost_information: {
                        upfront_cost: "1.00",
                        monthly_cost: "1.00",
                        currency: "USD"
                    }
                });
            }

            return new Response(
                JSON.stringify({ data: mockNumbers }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
            );
        }

        if (!telnyxApiKey) {
            throw new Error('Server misconfiguration: Missing Telnyx API Key');
        }

        // Build Telnyx API URL
        const url = new URL('https://api.telnyx.com/v2/available_phone_numbers');
        url.searchParams.append('filter[country_code]', country_code);
        url.searchParams.append('filter[limit]', '10'); // Limit to 10 results
        url.searchParams.append('filter[features][]', 'sms'); // Ensure SMS capability
        url.searchParams.append('filter[features][]', 'voice'); // Ensure Voice capability

        if (state) {
            url.searchParams.append('filter[administrative_area]', state);
        }
        if (city) {
            url.searchParams.append('filter[locality]', city);
        }
        if (area_code) {
            // Telnyx recommendation: if searching by area code, map it to national_destination_code
            // Or use starts_with if NDC is not strict.
            // Using national_destination_code for accuracy if country supports it (US/CA/BR generally do).
            url.searchParams.append('filter[national_destination_code]', area_code);
        }

        console.log(`Searching numbers at: ${url.toString()}`);

        const response = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${telnyxApiKey}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Telnyx API Error:', errorData);
            throw new Error(errorData?.errors?.[0]?.detail || 'Failed to fetch numbers from Telnyx');
        }

        const data = await response.json();

        return new Response(
            JSON.stringify(data),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        console.error('Error in search_numbers:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
