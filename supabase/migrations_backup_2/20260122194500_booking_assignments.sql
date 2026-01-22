-- Booking Assignments (Many-to-Many)
-- Replaces single 'assigned_to' column logic, but we keep 'assigned_to' as a 'primary lead' or legacy column.

CREATE TABLE IF NOT EXISTS public.booking_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  pay_rate DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending', -- pending, completed, paid
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent double assignment of same person to same booking
  UNIQUE(booking_id, member_id)
);

-- RLS
ALTER TABLE public.booking_assignments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Tenant read access" ON public.booking_assignments
  FOR SELECT USING (
    -- Access if user is tenant owner OR user is the assigned member
    EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_assignments.booking_id 
        AND b.tenant_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.id = booking_assignments.member_id
        AND tm.user_id = auth.uid()
    )
);

CREATE POLICY "Tenant write access" ON public.booking_assignments
  FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.bookings b 
        WHERE b.id = booking_assignments.booking_id 
        AND b.tenant_id = auth.uid()
    )
);

-- Indices
CREATE INDEX idx_booking_assignments_booking ON public.booking_assignments(booking_id);
CREATE INDEX idx_booking_assignments_member ON public.booking_assignments(member_id);

-- TRIGGER FUNCTION: Prevent Overlap
CREATE OR REPLACE FUNCTION public.check_assignment_overlap()
RETURNS TRIGGER AS $$
DECLARE
    v_start TIMESTAMPTZ;
    v_end TIMESTAMPTZ;
    v_count INT;
BEGIN
    -- Get booking time range
    SELECT start_date, end_date INTO v_start, v_end
    FROM public.bookings
    WHERE id = NEW.booking_id;

    -- Check for overlap with OTHER bookings for the SAME member
    SELECT COUNT(*) INTO v_count
    FROM public.booking_assignments ba
    JOIN public.bookings b ON b.id = ba.booking_id
    WHERE ba.member_id = NEW.member_id
      AND ba.booking_id != NEW.booking_id -- Exclude self
      AND b.status NOT IN ('cancelled', 'completed') -- Only active bookings
      -- Overlap logic: (StartA < EndB) and (EndA > StartB)
      AND b.start_date < v_end
      AND b.end_date > v_start;

    IF v_count > 0 THEN
        RAISE EXCEPTION 'Conflict detected: Member is already assigned to another booking during this time.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER
CREATE TRIGGER trg_check_assignment_overlap
BEFORE INSERT OR UPDATE ON public.booking_assignments
FOR EACH ROW
EXECUTE FUNCTION public.check_assignment_overlap();
