-- CORREÇÃO FINAL: Criar Tenant Completo e Atualizar Clientes
-- Execute no Supabase SQL Editor

-- 1. Criar o tenant para seu usuário (com slug e name obrigatórios)
INSERT INTO tenants (id, name, slug)
VALUES (
    '62b4704c-d307-4e33-8ec9-4d018a30bfd6', -- Seu UUID
    'Minha Empresa',                        -- Nome Obrigatório
    'minha-empresa'                         -- Slug Obrigatório
)
ON CONFLICT (id) DO NOTHING;

-- 2. Atualizar TODOS os clientes para este tenant
UPDATE customers 
SET tenant_id = '62b4704c-d307-4e33-8ec9-4d018a30bfd6';

-- 3. Verificar resultados
SELECT id, name, tenant_id FROM customers LIMIT 5;
