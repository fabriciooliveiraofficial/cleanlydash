-- DELETE FAKE INVOICES
-- We manually inserted these to "fix" the link, but they pointed to random bookings.
-- Now that the code supports fetching from `tenant_invoices`, we should remove these
-- so the UI falls back to the correct Manual Invoice data.

DELETE FROM public.invoices 
WHERE id IN (
    'f76e4e29-7a9c-4bb3-8bd2-2d547ba69048',
    '4e3cf2a8-7999-42f6-abf6-3a45726ab372',
    '83cfd558-55db-4328-8dc0-30bc6fba0074'
);
