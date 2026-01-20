-- SCRIPT DE CORREÇÃO DE PERMISSÕES (ATUALIZADO V2)
-- Este script corrige casos onde o usuário existe no Auth mas não na tabela team_members.

DO $$
DECLARE
    -- 👇👇👇 COLOQUE SEU EMAIL AQUI 👇👇👇
    v_target_email TEXT := 'fabriciooliveiraofficial@gmail.com'; 
    -- 👆👆👆 ---------------------- 👆👆👆

    v_user_id UUID;
    v_tenant_id UUID;
    v_admin_role_id UUID;
    v_member_exists BOOLEAN;
BEGIN
    -- 1. Buscar ID do usuário direto da tabela de autenticação (auth.users)
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = v_target_email;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário NÃO encontrado no sistema (auth.users) com o email %. Verifique se o email está correto.', v_target_email;
    END IF;

    -- 2. Verificar se já existe em team_members
    SELECT EXISTS (SELECT 1 FROM public.team_members WHERE user_id = v_user_id) INTO v_member_exists;

    -- Se não existir, CRIAR o registro (Assumindo que ele é o Dono/Tenant de si mesmo)
    IF NOT v_member_exists THEN
        RAISE NOTICE 'Usuário não estava na tabela team_members. Criando registro...';
        
        -- Inserir como Dono (Tenant = User ID)
        INSERT INTO public.team_members (user_id, tenant_id, name, email, role, status)
        VALUES (
            v_user_id, 
            v_user_id, 
            'Admin (Recuperado)', 
            v_target_email, 
            'property_owner', 
            'active'
        );
        
        v_tenant_id := v_user_id; -- Ele é o tenant
    ELSE
        -- Se já existe, pegar o tenant_id atual
        SELECT tenant_id INTO v_tenant_id
        FROM public.team_members
        WHERE user_id = v_user_id
        LIMIT 1;
    END IF;

    -- 3. Garantir que a role "Super Admin" existe para este tenant
    SELECT id INTO v_admin_role_id 
    FROM public.custom_roles 
    WHERE tenant_id = v_tenant_id AND name = 'Super Admin';

    IF v_admin_role_id IS NULL THEN
        INSERT INTO public.custom_roles (tenant_id, name, description, permissions, is_system)
        VALUES (v_tenant_id, 'Super Admin', 'Acesso total ao sistema', 
            '["finance.view_balance", "finance.manage_funds", "payroll.view", "payroll.manage", "team.view", "team.manage", "customers.view", "customers.manage", "tasks.view", "tasks.manage_all", "settings.view", "settings.manage"]'::jsonb, true)
        RETURNING id INTO v_admin_role_id;
        RAISE NOTICE 'Role Super Admin criada.';
    END IF;

    -- 4. Atualizar o usuário para ter esta role
    UPDATE public.team_members
    SET role_id = v_admin_role_id,
        role = 'property_owner' -- Forçar compatibilidade legado também
    WHERE user_id = v_user_id;

    RAISE NOTICE 'SUCESSO TOTAL! Registro recuperado e permissões de Super Admin aplicadas para %', v_target_email;
END $$;
