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

            // Use direct fetch to bypass supabase-js potential issues
            const functionUrl = 'https://jjbokilvurxztqiwvxhy.supabase.co/functions/v1/stripe-connect-oauth';
            console.log('[DEBUG] Calling:', functionUrl);
            console.log('[DEBUG] Token being sent:', session.access_token.substring(0, 80) + '...');

            // Use anon key for gateway auth, pass user_id in body for user validation
            const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYm9raWx2dXJ4enRxaXd2eGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTYxMjYsImV4cCI6MjA4MzM3MjEyNn0.6XrV6S665pYDibo4RA52ddb-JCTk7jyikwgxs2lpTRs';

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${anonKey}`,
                    'Content-Type': 'application/json',
                    'apikey': anonKey
                },
                body: JSON.stringify({
                    action: 'get_authorize_url',
                    redirect_uri: window.location.origin + '/platform/callback',
                    user_id: session.user.id  // Pass user ID for server-side validation
                })
            });

            const responseText = await response.text();
            console.log('[DEBUG] Response Status:', response.status);
            console.log('[DEBUG] Response Body:', responseText);

            if (!response.ok) {
                throw new Error(`Function error: ${response.status} - ${responseText}`);
            }

            const data = JSON.parse(responseText);
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No URL returned");
            }

        } catch (err) {
            console.error("Stripe Connect Error:", err);
            toast.error("Erro ao iniciar conexão com Stripe.");
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
