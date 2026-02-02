
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jjbokilvurxztqiwvxhy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role to bypass RLS if needed, or anon if user allows.

if (!supabaseKey) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY or ANON key variables.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettings() {
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
        console.error("Error listing users:", userError);
        return;
    }

    console.log(`Found ${users.users.length} users.`);

    const { data: settings, error } = await supabase
        .from('telnyx_settings')
        .select('*');

    if (error) {
        console.error("Error fetching settings:", error);
    } else {
        console.log("Telnyx Settings:", JSON.stringify(settings, null, 2));
    }
}

checkSettings();
