-- Migration 024: KYC Verification System & Wallets
-- Enforces KYC before telephony access and tracks user credits for AI usage

-- 1. Wallets Table (Credit Balance for AI Features)
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Wallet Transactions Log
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')) NOT NULL,
    amount DECIMAL(10,4) NOT NULL,
    description TEXT,
    reference_id TEXT, -- E.g., Stripe payment ID or AI usage ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. KYC Verifications Table
CREATE TABLE IF NOT EXISTS public.kyc_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Status Tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'rejected')),
    
    -- Business Info
    company_name TEXT,
    company_type TEXT CHECK (company_type IN ('individual', 'llc', 'corporation', 'nonprofit', 'other')),
    tax_id TEXT, -- EIN/CNPJ/VAT
    country TEXT DEFAULT 'BR',
    
    -- Contact Info
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    
    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    
    -- Document References (Supabase Storage paths)
    document_id_path TEXT,        -- Government ID
    document_address_path TEXT,   -- Proof of Address
    document_company_path TEXT,   -- Company Registration
    
    -- Telnyx Integration
    telnyx_identity_id TEXT,      -- Business Identity ID from Telnyx
    
    -- Verification Metadata
    rejection_reason TEXT,
    verified_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS Policies

-- Wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.wallets;
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);

-- Wallet Transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions 
    FOR SELECT USING (
        wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
    );

-- KYC Verifications
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own KYC" ON public.kyc_verifications;
CREATE POLICY "Users can view own KYC" ON public.kyc_verifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own KYC" ON public.kyc_verifications;
CREATE POLICY "Users can update own KYC" ON public.kyc_verifications 
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own KYC" ON public.kyc_verifications;
CREATE POLICY "Users can insert own KYC" ON public.kyc_verifications 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Auto-create wallet for new users (Trigger)
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (NEW.id, 0.00)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_wallet ON auth.users;
CREATE TRIGGER on_auth_user_created_wallet
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();
