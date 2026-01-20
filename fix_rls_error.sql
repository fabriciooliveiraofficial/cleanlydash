-- DIAGNÓSTICO E CORREÇÃO EMERGENCIAL (V4)
-- Execute este script no Supabase SQL Editor

-- ============================================
-- PASSO 1: DESABILITAR RLS TEMPORARIAMENTE
-- Isso vai permitir acesso total para diagnóstico
-- ============================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASSO 2: VERIFICAR SE COLUNAS EXISTEM
-- Se der erro, significa que a coluna não existe
-- ============================================

-- Adiciona tenant_id em profiles se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE profiles ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- Adiciona tenant_id em customers se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customers' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE customers ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- ============================================
-- PASSO 3: RE-HABILITAR RLS COM POLÍTICAS SIMPLES
-- ============================================

-- Limpar TODAS as políticas antigas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON profiles';
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'customers') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON customers';
    END LOOP;
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bookings') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON bookings';
    END LOOP;
END $$;

-- Re-habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- PROFILES: Política ultra-simples - usuário vê apenas seu próprio perfil (id = auth.uid)
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- CUSTOMERS: Usuário vê clientes com seu tenant_id, OU se tenant_id for NULL (migração)
CREATE POLICY "customers_select" ON customers FOR SELECT USING (tenant_id = auth.uid() OR tenant_id IS NULL);
CREATE POLICY "customers_insert" ON customers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "customers_update" ON customers FOR UPDATE USING (tenant_id = auth.uid() OR tenant_id IS NULL);
CREATE POLICY "customers_delete" ON customers FOR DELETE USING (tenant_id = auth.uid() OR tenant_id IS NULL);

-- BOOKINGS: Assumindo que bookings tem tenant_id ou está vinculado a customer
-- Se não tiver tenant_id, cria política permissiva temporária
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "bookings_delete" ON bookings FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- PASSO 4: TRIGGER PARA AUTO-PREENCHER tenant_id
-- ============================================

CREATE OR REPLACE FUNCTION public.set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger em customers
DROP TRIGGER IF EXISTS set_customer_tenant ON customers;
CREATE TRIGGER set_customer_tenant
    BEFORE INSERT ON customers
    FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id();

-- ============================================
-- MENSAGEM DE SUCESSO
-- ============================================
SELECT 'RLS configurado com sucesso! Faça logout/login e teste.' AS resultado;
