
CREATE TABLE IF NOT EXISTS function_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    function_name TEXT,
    level TEXT,
    message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
