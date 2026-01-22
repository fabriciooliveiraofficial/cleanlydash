-- Migration: 20240112_admin_credits_rpc.sql
-- Purpose: Allow Super Admins to manually add credits to user wallets

CREATE OR REPLACE FUNCTION public.admin_add_credits(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id UUID;
    v_new_balance DECIMAL;
    v_performer_role app_role;
BEGIN
    -- 1. Authorization Check (Must be Super Admin)
    SELECT role INTO v_performer_role FROM public.user_roles WHERE user_id = auth.uid();
    
    IF v_performer_role IS NULL OR v_performer_role != 'super_admin' THEN
        RAISE EXCEPTION 'Unauthorized: Only Super Admins can add credits manually.';
    END IF;

    -- 2. Validation
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive.';
    END IF;

    -- 3. Get Wallet
    SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id;
    
    IF v_wallet_id IS NULL THEN
        -- Auto-create if missing (edge case)
        INSERT INTO public.wallets (user_id, balance) VALUES (p_user_id, 0.00)
        RETURNING id INTO v_wallet_id;
    END IF;

    -- 4. Update Balance
    UPDATE public.wallets
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

    -- 5. Log Transaction
    INSERT INTO public.wallet_transactions (wallet_id, type, amount, description, reference_id)
    VALUES (v_wallet_id, 'credit', p_amount, p_description, 'manual_admin_grant');

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'message', 'Credits added successfully'
    );
END;
$$;
