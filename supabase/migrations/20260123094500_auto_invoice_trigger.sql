-- CRIAÇÃO DA FATURA AUTOMÁTICA AO CONCLUIR AGENDAMENTO
-- Este trigger garante que, sempre que um trabalho for concluído (seja pelo app cleaner ou pelo admin),
-- uma fatura seja gerada automaticamente se ainda não existir uma.

CREATE OR REPLACE FUNCTION public.handle_booking_completion_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_checklist_snapshot JSONB;
BEGIN
    -- Verifica se o status mudou para 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Verifica se já existe uma fatura para este booking (evita duplicidade)
        IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
            
            -- Busca as tarefas do serviço para criar o snapshot do checklist
            IF NEW.service_id IS NOT NULL THEN
                SELECT jsonb_agg(jsonb_build_object(
                    'id', t.id,
                    'title', t.title,
                    'is_completed', false
                ))
                INTO v_checklist_snapshot
                FROM public.service_def_tasks sdt
                JOIN public.tasks t ON t.id = sdt.task_id
                WHERE sdt.service_id = NEW.service_id;
            END IF;

            -- Se não houver tarefas, define como um array vazio
            IF v_checklist_snapshot IS NULL THEN
                v_checklist_snapshot := '[]'::jsonb;
            END IF;

            -- Insere a fatura
            INSERT INTO public.invoices (
                tenant_id,
                customer_id,
                booking_id,
                amount,
                status,
                checklist_snapshot,
                issued_date,
                due_date
            ) VALUES (
                NEW.tenant_id,
                NEW.customer_id,
                NEW.id,
                COALESCE(NEW.price, 0),
                'draft',
                v_checklist_snapshot,
                CURRENT_DATE,
                CURRENT_DATE + INTERVAL '7 days'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criação do Trigger
DROP TRIGGER IF EXISTS on_booking_completed_invoice ON public.bookings;
CREATE TRIGGER on_booking_completed_invoice
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_completion_invoice();

-- Garantia de que a tabela invoices tem as colunas necessárias (caso migrações anteriores tenham falhado)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT CURRENT_DATE + 7;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;

-- Notifica o PostgREST para recarregar o esquema
NOTIFY pgrst, 'reload config';
