-- 1. Add balance cache to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) DEFAULT 0;

-- 2. Initial balance calculation
UPDATE public.tenants t
SET wallet_balance = (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.wallet_ledger
    WHERE tenant_id = t.id
);

-- 3. Create Trigger Function to keep balance updated
CREATE OR REPLACE FUNCTION public.sync_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.tenants
        SET wallet_balance = wallet_balance + NEW.amount
        WHERE id = NEW.tenant_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.tenants
        SET wallet_balance = wallet_balance - OLD.amount
        WHERE id = OLD.tenant_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        UPDATE public.tenants
        SET wallet_balance = wallet_balance - OLD.amount + NEW.amount
        WHERE id = NEW.tenant_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Trigger
DROP TRIGGER IF EXISTS trg_sync_wallet_balance ON public.wallet_ledger;
CREATE TRIGGER trg_sync_wallet_balance
AFTER INSERT OR UPDATE OR DELETE ON public.wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance();

-- 5. Create Atomic Transaction RPC
CREATE OR REPLACE FUNCTION public.process_wallet_transaction(
    p_tenant_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_service_type TEXT DEFAULT 'generic'
)
RETURNS JSON AS $$
DECLARE
    v_current_balance NUMERIC;
BEGIN
    -- Get latest balance with row lock for update
    SELECT wallet_balance INTO v_current_balance
    FROM public.tenants
    WHERE id = p_tenant_id
    FOR UPDATE;

    -- Check if it's a debit and if we have enough funds
    IF p_amount < 0 AND (v_current_balance + p_amount) < 0 THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Insufficient funds',
            'current_balance', v_current_balance
        );
    END IF;

    -- Insert into ledger (Trigger will handle the balance update)
    INSERT INTO public.wallet_ledger (tenant_id, amount, description, service_type)
    VALUES (p_tenant_id, p_amount, p_description, p_service_type);

    RETURN json_build_object(
        'success', true,
        'new_balance', v_current_balance + p_amount
    );
END;
$$ LANGUAGE plpgsql;
