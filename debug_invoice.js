
const supabaseUrl = 'https://jjbokilvurxztqiwvxhy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYm9raWx2dXJ4enRxaXd2eGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTYxMjYsImV4cCI6MjA4MzM3MjEyNn0.6XrV6S665pYDibo4RA52ddb-JCTk7jyikwgxs2lpTRs';

async function fetchInvoice() {
    const invoiceId = '83cfd558-55db-4328-8dc0-30bc6fba0074';
    console.log(`Fetching invoice ${invoiceId}...`);

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/invoices?id=eq.${invoiceId}&select=*`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                // 'Accept': 'application/vnd.pgrst.object+json' // Commented out to see empty array if valid but no rows
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log('Data received:', JSON.stringify(data, null, 2));

        if (Array.isArray(data) && data.length === 0) {
            console.log("No rows returned. This implies:");
            console.log("1. The ID does not exist.");
            console.log("2. RLS policy blocked access (e.g., status is not 'draft', 'sent', 'paid', 'cancelled').");
            console.log("3. The row has a relationship mismatch (e.g. customer_id is null/invalid), causing the join to filter it out if using inner join (but standard Supabase select uses left join).");
        }

    } catch (err) {
        console.error('Fetch error:', err);
    }
}

fetchInvoice();
