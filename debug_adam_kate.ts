import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load .env
if (fs.existsSync('.env')) {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jjbokilvurxztqiwvxhy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
    console.error("CRITICAL: Supabase Anon Key not found in environment!");
    process.exit(1);
}

const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

async function debugAdamKate() {
    console.log(`URL: ${supabaseUrl}`);
    console.log("Searching for 'Adam Kate'...");

    const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('id, name, tenant_id')
        .ilike('name', '%Adam Kate%');

    if (custError) {
        console.error("Error finding customer:", custError);
        return;
    }

    if (!customers || customers.length === 0) {
        console.log("No customer found matching 'Adam Kate'");
        return;
    }

    console.log(`Found ${customers.length} customer(s):`);
    for (const customer of customers) {
        console.log(`- ID: ${customer.id}, Name: ${customer.name}, Tenant: ${customer.tenant_id}`);

        console.log(`\nChecking bookings for ${customer.name} (ID: ${customer.id})...`);
        const { data: bookings, error: bookError } = await supabase
            .from('bookings')
            .select('*')
            .eq('customer_id', customer.id);

        if (bookError) {
            console.error(`Error finding bookings for ${customer.name}:`, bookError);
            continue;
        }

        console.log(`Total bookings found: ${bookings.length}`);
        bookings.forEach(b => {
            console.log(`  [${b.id}] Start: ${b.start_time}, Status: ${b.status}, Invoice: ${b.invoice_status}, Tenant: ${b.tenant_id}`);
        });

        const available = bookings.filter(b =>
            (b.invoice_status === null || b.invoice_status !== 'invoiced') &&
            b.status !== 'cancelled'
        );
        console.log(`Available for import: ${available.length}`);
    }
}

debugAdamKate();
