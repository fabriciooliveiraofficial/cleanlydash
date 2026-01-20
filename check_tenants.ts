import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: tenants, error } = await supabase.from('tenants').select('id, name');
    console.log('Tenants in DB:', tenants);
    if (error) console.error('Error:', error);
}

check();
