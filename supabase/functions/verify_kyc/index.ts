import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Verify KYC - Submits KYC data to Telnyx Business Identity API
 * Called after user submits the KYC form in KYCVerificationModal
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('Missing Authorization Header');
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

        if (userError || !user) {
            throw new Error('Unauthorized');
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Get KYC data from database
        const { data: kyc, error: kycError } = await supabaseAdmin
            .from('kyc_verifications')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (kycError || !kyc) {
            throw new Error('KYC data not found. Please fill out the verification form first.');
        }

        if (kyc.status === 'approved') {
            return new Response(JSON.stringify({
                message: 'KYC already approved',
                status: 'approved'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // --- Hybrid Validation Logic ---
        console.log(`Validating KYC for country: ${kyc.country}`);

        // Brazil Validation
        if (kyc.country === 'BR') {
            const cleanTaxId = kyc.tax_id.replace(/\D/g, '');
            // Validate CNPJ (14 digits) or CPF (11 digits)
            if (cleanTaxId.length !== 14 && cleanTaxId.length !== 11) {
                // Reject immediately if invalid format
                const { error: rejectError } = await supabaseAdmin
                    .from('kyc_verifications')
                    .update({
                        status: 'rejected',
                        rejection_reason: 'Documento inválido. CPF deve ter 11 dígitos e CNPJ 14 dígitos.',
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);

                if (rejectError) throw rejectError;

                throw new Error('Documento inválido. Por favor verifique o CNPJ ou CPF informado.');
            }
        }

        // US Validation
        else if (kyc.country === 'US') {
            const cleanTaxId = kyc.tax_id.replace(/\D/g, '');
            // Validate EIN (9 digits)
            if (cleanTaxId.length !== 9) {
                const { error: rejectError } = await supabaseAdmin
                    .from('kyc_verifications')
                    .update({
                        status: 'rejected',
                        rejection_reason: 'Invalid Tax ID. EIN must be 9 digits.',
                        updated_at: new Date().toISOString()
                    })
                    .eq('user_id', user.id);

                if (rejectError) throw rejectError;

                throw new Error('Invalid Tax ID. Please provide a valid 9-digit EIN.');
            }
        }

        // Call Telnyx Business Identity API
        const telnyxMasterKey = Deno.env.get('TELNYX_MASTER_KEY');

        let verificationStatus = 'submitted';
        let telnyxIdentityId = kyc.telnyx_identity_id;

        if (telnyxMasterKey) {
            console.log('Submitting KYC to Telnyx...');

            const telnyxPayload = {
                business_name: kyc.company_name,
                business_type: mapCompanyType(kyc.company_type),
                tax_id: kyc.tax_id,
                first_name: kyc.contact_name?.split(' ')[0] || '',
                last_name: kyc.contact_name?.split(' ').slice(1).join(' ') || '',
                email: kyc.contact_email,
                phone_number: kyc.contact_phone,
                address: {
                    administrative_area: kyc.state,
                    locality: kyc.city,
                    postal_code: kyc.postal_code,
                    address_lines: [kyc.address_line1, kyc.address_line2].filter(Boolean),
                    country_code: kyc.country === 'BR' ? 'BR' : kyc.country
                }
            };

            try {
                const telnyxResponse = await fetch('https://api.telnyx.com/v2/business_identities', {
                    method: kyc.telnyx_identity_id ? 'PATCH' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${telnyxMasterKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(telnyxPayload)
                });

                if (telnyxResponse.ok) {
                    const result = await telnyxResponse.json();
                    telnyxIdentityId = result.data?.id;

                    // Map Telnyx verification status
                    const telnyxStatus = result.data?.verification_status;
                    if (telnyxStatus === 'verified') {
                        verificationStatus = 'approved';
                    } else if (telnyxStatus === 'failed' || telnyxStatus === 'rejected') {
                        verificationStatus = 'rejected';
                    } else {
                        verificationStatus = 'submitted';
                    }
                } else {
                    const errorData = await telnyxResponse.json();
                    console.error('Telnyx API Error:', errorData);
                    throw new Error(`Telnyx verification failed: ${errorData.errors?.[0]?.detail || 'Unknown error'}`);
                }
            } catch (fetchError: any) {
                console.error('Telnyx Fetch Error:', fetchError);
                // Don't fail completely - mark as submitted for manual review
                verificationStatus = 'submitted';
            }
        } else {
            console.log('Simulating Telnyx KYC Verification (No API Key)...');
            // In simulation mode, auto-approve for testing
            telnyxIdentityId = `sim_${crypto.randomUUID().split('-')[0]}`;
            verificationStatus = 'approved'; // Auto-approve in simulation
        }

        // Update KYC status in database
        const { error: updateError } = await supabaseAdmin
            .from('kyc_verifications')
            .update({
                status: verificationStatus,
                telnyx_identity_id: telnyxIdentityId,
                verified_at: verificationStatus === 'approved' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)

        if (updateError) throw updateError;

        return new Response(
            JSON.stringify({
                success: true,
                status: verificationStatus,
                telnyx_identity_id: telnyxIdentityId,
                message: verificationStatus === 'approved'
                    ? 'KYC approved! You can now activate telephony.'
                    : 'KYC submitted for review. Approval usually takes up to 48 hours.'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})

// Map our company types to Telnyx business types
function mapCompanyType(type: string): string {
    const mapping: Record<string, string> = {
        'individual': 'sole_proprietorship',
        'llc': 'limited_liability_company',
        'corporation': 'corporation',
        'nonprofit': 'non_profit',
        'other': 'other'
    };
    return mapping[type] || 'other';
}
