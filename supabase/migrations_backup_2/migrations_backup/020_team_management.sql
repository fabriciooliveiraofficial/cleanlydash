-- Team Management System Migration
-- This adds comprehensive team member management with availability and payroll

-- 1. Enhanced team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID NOT NULL,
  
  -- Profile
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  color TEXT DEFAULT '#6366f1',
  role app_role DEFAULT 'staff',
  
  -- Compensation Model
  pay_type TEXT DEFAULT 'hourly' CHECK (pay_type IN ('hourly', 'daily', 'per_job', 'salary', 'commission')),
  pay_rate DECIMAL(10,2) DEFAULT 0,
  commission_percent DECIMAL(5,2) DEFAULT 0,
  salary_period TEXT CHECK (salary_period IN ('weekly', 'biweekly', 'monthly')),
  
  -- Settings
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Weekly availability schedule
CREATE TABLE IF NOT EXISTS public.team_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL DEFAULT '08:00',
  end_time TIME NOT NULL DEFAULT '18:00',
  is_available BOOLEAN DEFAULT true,
  UNIQUE(member_id, day_of_week)
);

-- 3. Time-off / Exceptions (vacations, sick days)
CREATE TABLE IF NOT EXISTS public.team_time_off (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  is_all_day BOOLEAN DEFAULT true,
  start_time TIME,
  end_time TIME,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payroll periods
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  period_type TEXT DEFAULT 'biweekly' CHECK (period_type IN ('weekly', 'biweekly', 'monthly', 'custom')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'processing', 'approved', 'paid')),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payroll entries (one per member per period)
CREATE TABLE IF NOT EXISTS public.payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.team_members(id),
  
  -- Work Summary
  hours_worked DECIMAL(6,2) DEFAULT 0,
  days_worked INT DEFAULT 0,
  jobs_completed INT DEFAULT 0,
  booking_value_total DECIMAL(10,2) DEFAULT 0,
  
  -- Compensation
  pay_type TEXT NOT NULL,
  pay_rate DECIMAL(10,2) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  
  -- Adjustments
  bonuses DECIMAL(10,2) DEFAULT 0,
  bonus_notes TEXT,
  deductions DECIMAL(10,2) DEFAULT 0,
  deduction_notes TEXT,
  
  -- Final
  net_amount DECIMAL(10,2) GENERATED ALWAYS AS (gross_amount + bonuses - deductions) STORED,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Time entries (for hourly tracking / clock in-out)
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_minutes INT DEFAULT 0,
  manual_hours DECIMAL(5,2), -- For manual entry if not using clock
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tenant can manage their team
-- RLS Policies: Tenant can manage their team
DROP POLICY IF EXISTS "Tenant manages team_members" ON public.team_members;
CREATE POLICY "Tenant manages team_members" ON public.team_members
FOR ALL USING (auth.uid() = tenant_id OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Tenant manages team_availability" ON public.team_availability;
CREATE POLICY "Tenant manages team_availability" ON public.team_availability
FOR ALL USING (
  member_id IN (SELECT id FROM public.team_members WHERE tenant_id = auth.uid() OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Tenant manages team_time_off" ON public.team_time_off;
CREATE POLICY "Tenant manages team_time_off" ON public.team_time_off
FOR ALL USING (
  member_id IN (SELECT id FROM public.team_members WHERE tenant_id = auth.uid() OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Tenant manages payroll_periods" ON public.payroll_periods;
CREATE POLICY "Tenant manages payroll_periods" ON public.payroll_periods
FOR ALL USING (tenant_id = auth.uid());

DROP POLICY IF EXISTS "Tenant manages payroll_entries" ON public.payroll_entries;
CREATE POLICY "Tenant manages payroll_entries" ON public.payroll_entries
FOR ALL USING (
  period_id IN (SELECT id FROM public.payroll_periods WHERE tenant_id = auth.uid())
);

DROP POLICY IF EXISTS "Tenant manages time_entries" ON public.time_entries;
CREATE POLICY "Tenant manages time_entries" ON public.time_entries
FOR ALL USING (
  member_id IN (SELECT id FROM public.team_members WHERE tenant_id = auth.uid() OR user_id = auth.uid())
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_team_members_tenant ON public.team_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_periods_tenant ON public.payroll_periods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_member ON public.time_entries(member_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON public.time_entries(date);
