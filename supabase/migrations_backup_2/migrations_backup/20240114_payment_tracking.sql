-- Migration: 20240114_payment_tracking.sql
-- Purpose: Add per-job payment tracking fields to bookings table

-- Add payment tracking columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cleaner_pay_rate DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS pay_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES auth.users(id);

-- Add constraint for pay_status
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_pay_status_check 
CHECK (pay_status IN ('pending', 'paid', 'cancelled'));

-- Create index for efficient querying of pending payments
CREATE INDEX IF NOT EXISTS idx_bookings_pay_status ON public.bookings(pay_status);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_to_pay ON public.bookings(assigned_to, pay_status);

-- Comment for documentation
COMMENT ON COLUMN public.bookings.cleaner_pay_rate IS 'Amount to pay the cleaner for this specific job';
COMMENT ON COLUMN public.bookings.pay_status IS 'Payment status: pending, paid, or cancelled';
COMMENT ON COLUMN public.bookings.paid_at IS 'Timestamp when payment was marked as complete';
COMMENT ON COLUMN public.bookings.paid_by IS 'User ID of admin who marked payment as complete';
