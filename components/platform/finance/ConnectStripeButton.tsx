import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { ExternalLink, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '../../../lib/supabase/client';
import { toast } from 'sonner';

interface ConnectStripeButtonProps {
    connectedAccountId?: string;
    onConnect?: () => void;
}

export const ConnectStripeButton: React.FC<ConnectStripeButtonProps> = ({ connectedAccountId, onConnect }) => {
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    const handleConnect = async () => {
        setLoading(true);
        try {
            // DEBUG: Check session before calling
            const { data: { session } } = await supabase.auth.getSession();
            console.log('[DEBUG] Current Session:', session ? 'EXISTS' : 'NULL');
            console.log('[DEBUG] Access Token:', session?.access_token?.substring(0, 50) + '...');

            if (!session?.access_token) {
                toast.error("Sessão inválida. Por favor, faça logout e login novamente.");
                setLoading(false);
                return;
            }

            // Manual fetch to ensure we see the raw response body even on 401
            const response = await fetch('https://jjbokilvurxztqiwvxhy.supabase.co/functions/v1/stripe-connect-oauth', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'get_authorize_url',
                    redirect_uri: window.location.origin + '/platform/callback'
                })
            });

            const text = await response.text();
            console.log("[DEBUG] Raw Response Status:", response.status);
            console.log("[DEBUG] Raw Response Body:", text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error(`Erro do servidor (${response.status})`);
            }

            if (!response.ok) {
                const errorMsg = data?.details || data?.error || text || "Erro desconhecido";
                throw new Error(errorMsg);
            }

            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("Resposta inesperada: URL ausente no corpo.");
            }

        } catch (err: any) {
            console.error("Stripe Connect Final Error:", err);
            toast.error(err.message || "Erro ao iniciar conexão com Stripe.");
            setLoading(false);
        }
    };

    // Safety check: Reset loading if user comes back without completing redirect (aborted flow)
    React.useEffect(() => {
        const handleFocus = () => setLoading(false);
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    if (connectedAccountId) {
        return (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                <CheckCircle size={18} />
                <span className="font-bold text-sm">Conta Conectada</span>
                <span className="text-xs font-mono opacity-50">({connectedAccountId.slice(0, 8)}...)</span>
            </div>
        );
    }

    return (
        <Button
            onClick={handleConnect}
            disabled={loading}
            className="bg-[#635BFF] hover:bg-[#5851E1] text-white font-bold shadow-lg shadow-indigo-200"
        >
            {loading ? <Loader2 className="animate-spin mr-2" /> : <ExternalLink className="mr-2" size={18} />}
            Conectar conta Stripe
        </Button>
    );
};
