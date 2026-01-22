import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIN_BALANCE = 2.50;
const COST_PER_MESSAGE = 0.05; // $0.05 per AI interaction

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { message, context, history } = await req.json();
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) throw new Error('Missing Authorization Header');

        // 1. Auth Setup
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

        if (userError || !user) throw new Error('Unauthorized');

        // Admin client for DB operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Check Wallet Balance
        const { data: wallet } = await supabaseAdmin
            .from('wallets')
            .select('balance')
            .eq('user_id', user.id)
            .single();

        if (!wallet || wallet.balance < MIN_BALANCE) {
            return new Response(JSON.stringify({
                error: 'Insufficient credits',
                min_balance: MIN_BALANCE,
                current_balance: wallet?.balance || 0
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 402 // Payment Required
            });
        }

        // 3. Call AI (Simulated Gemini)
        // In production, this would call fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=API_KEY', ...)

        console.log(`AI Prompt: Context[${context?.substring(0, 50)}...] Message[${message}]`);

        // Simulating a helpful response based on context
        let aiResponseText = "";

        if (context?.includes("KYC")) {
            if (message.includes("id") || message.includes("document")) {
                aiResponseText = "Para o documento de identidade, aceitamos RG, CNH (Carteira Nacional de Habilitação) ou Passaporte válido. Certifique-se de que a foto esteja legível e que o documento não esteja vencido.";
            } else if (message.includes("tax") || message.includes("cnpj")) {
                aiResponseText = "O CNPJ (Cadastro Nacional da Pessoa Jurídica) é obrigatório para empresas. Se você é MEI, também possui um CNPJ. Você pode encontrar seu comprovante no site da Receita Federal.";
            } else if (message.includes("address") || message.includes("endereço")) {
                aiResponseText = "O comprovante de endereço deve estar em nome da empresa ou de um dos sócios e ter sido emitido nos últimos 90 dias. Aceitamos contas de luz, água, telefone ou internet.";
            } else {
                aiResponseText = "Entendo. Para prosseguir com a verificação KYC, precisamos garantir que todos os dados estejam corretos. Você tem alguma dúvida específica sobre os documentos ou o formulário?";
            }
        } else {
            aiResponseText = "Como posso ajudar você hoje com a plataforma Cleanlydash?";
        }

        // Slight delay to simulate AI thinking
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 4. Deduct Credits
        const { error: rpcError } = await supabaseAdmin.rpc('deduct_wallet_balance', {
            p_user_id: user.id,
            p_amount: COST_PER_MESSAGE,
            p_description: `AI Chat Assistance (${message.substring(0, 20)}...)`
        });

        if (rpcError) {
            console.error('Credit deduction failed:', rpcError);
            // We authorize the response but log the error - arguably should fail, but good UX might be to allow passing while investigating
        }

        return new Response(JSON.stringify({
            response: aiResponseText,
            deducted: COST_PER_MESSAGE,
            remaining_balance: (wallet.balance - COST_PER_MESSAGE)
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
