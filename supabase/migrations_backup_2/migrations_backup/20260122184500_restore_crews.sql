-- Crews Table
CREATE TABLE IF NOT EXISTS public.crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crew Members (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.crew_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID REFERENCES public.crews(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, member_id)
);

-- Enable RLS
ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Tenant manages crews" ON public.crews;
CREATE POLICY "Tenant manages crews" ON public.crews FOR ALL USING (auth.uid() = tenant_id);

DROP POLICY IF EXISTS "Tenant manages crew members" ON public.crew_members;
CREATE POLICY "Tenant manages crew members" ON public.crew_members FOR ALL USING (
  crew_id IN (SELECT id FROM public.crews WHERE tenant_id = auth.uid())
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_crews_tenant ON public.crews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON public.crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_member ON public.crew_members(member_id);
