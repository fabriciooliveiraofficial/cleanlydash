import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../lib/supabase/client';
import { toast } from 'sonner';

const MIN_AI_BALANCE = 2.50;

interface WalletState {
    balance: number;
    loading: boolean;
    hasCredits: boolean;
}

export const useAICredits = () => {
    const [wallet, setWallet] = useState<WalletState>({
        balance: 0,
        loading: true,
        hasCredits: false
    });
    const supabase = createClient();
    // Router removed: App uses custom state routing

    const loadWallet = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .single();

            const balance = data?.balance || 0;
            setWallet({
                balance,
                loading: false,
                hasCredits: balance >= MIN_AI_BALANCE
            });
        } catch (err) {
            console.error('Failed to load wallet:', err);
            setWallet(prev => ({ ...prev, loading: false }));
        }
    }, [supabase]);

    useEffect(() => {
        loadWallet();
    }, [loadWallet]);

    /**
     * Check if user can use AI features.
     * Shows appropriate toast messages.
     * @returns true if user has sufficient credits
     */
    const checkCredits = useCallback((): boolean => {
        if (wallet.loading) {
            toast.info('Verificando créditos...');
            return false;
        }

        if (wallet.balance < MIN_AI_BALANCE) {
            toast.error('Créditos insuficientes para usar recursos de IA', {
                description: `Saldo mínimo necessário: $${MIN_AI_BALANCE.toFixed(2)}. Vá para Faturamento para recarregar.`,
                duration: 8000
            });
            return false;
        }

        // Warn user that credits will be consumed
        toast.warning('Este recurso consumirá créditos da sua carteira.', {
            description: `Saldo atual: $${wallet.balance.toFixed(2)}`,
            duration: 4000
        });


        return true;
    }, [wallet]);

    /**
     * Deduct credits from wallet after AI usage
     * @param amount Amount to deduct
     * @param description Description for transaction log
     */
    const deductCredits = useCallback(async (amount: number, description: string): Promise<boolean> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;

            // Use RPC to safely deduct (prevents race conditions)
            const { error } = await supabase.rpc('deduct_wallet_balance', {
                p_user_id: user.id,
                p_amount: amount,
                p_description: description
            });

            if (error) throw error;

            // Refresh wallet balance
            await loadWallet();
            return true;
        } catch (err: any) {
            console.error('Failed to deduct credits:', err);
            toast.error('Erro ao processar créditos');
            return false;
        }
    }, [supabase, loadWallet]);

    /**
     * Generic check for funds availability
     */
    const checkFunds = useCallback((cost: number, featureName: string = 'Recurso'): boolean => {
        if (wallet.loading) {
            toast.info('Verificando saldo...');
            return false;
        }

        if (wallet.balance < cost) {
            toast.error(`Saldo insuficiente para: ${featureName}`, {
                description: `Custo: $${cost.toFixed(2)}. Saldo atual: $${wallet.balance.toFixed(2)}.`,
                action: {
                    label: 'Recarregar',
                    onClick: () => window.location.href = '#billing' // Simple redirect or toggle
                }
            });
            return false;
        }
        return true;
    }, [wallet]);

    return {
        balance: wallet.balance,
        loading: wallet.loading,
        hasCredits: wallet.hasCredits,
        checkCredits,
        checkFunds,
        deductCredits,
        refreshWallet: loadWallet,
        MIN_BALANCE: MIN_AI_BALANCE
    };
};
