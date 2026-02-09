// @ts-nocheck
import { serve } from "http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, prefer',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    const { method } = req
    if (method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders, status: 200 })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const body = await req.json();
        const { tenantId, serviceId, addonIds, date, time, clientName, clientEmail, total } = body;

        // 1. Resolve or Create Customer
        let customerId;
        const { data: existingCustomer } = await supabaseAdmin
            .from('customers')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('email', clientEmail)
            .maybeSingle();

        if (existingCustomer) {
            customerId = existingCustomer.id;
        } else {
            const { data: newCustomer, error: custError } = await supabaseAdmin
                .from('customers')
                .insert({
                    tenant_id: tenantId,
                    first_name: clientName.split(' ')[0],
                    last_name: clientName.split(' ').slice(1).join(' ') || '',
                    email: clientEmail,
                    status: 'active'
                })
                .select()
                .single();

            if (custError) throw custError;
            customerId = newCustomer.id;
        }

        // 2. Fetch Service Details for Duration
        const { data: service } = await supabaseAdmin
            .from('services')
            .select('duration_minutes, name')
            .eq('id', serviceId)
            .single();

        // 3. Fetch Addon Details for Duration and Pricing
        const { data: addons } = await supabaseAdmin
            .from('addons')
            .select('id, duration_minutes, price')
            .in('id', addonIds);

        const totalDuration = (service?.duration_minutes || 0) + (addons?.reduce((sum, a) => sum + (a.duration_minutes || 0), 0) || 0);

        // 4. Calculate Start and End Dates
        const [year, month, day] = date.split('-').map(Number);
        const [hour, minute] = time.split(':').map(Number);

        const startDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
        const endDate = new Date(startDate.getTime() + totalDuration * 60 * 1000);

        // 5. Insert Booking
        const { data: booking, error: bookingError } = await supabaseAdmin
            .from('bookings')
            .insert({
                tenant_id: tenantId,
                customer_id: customerId,
                service_id: serviceId,
                status: 'pending',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                duration_minutes: totalDuration,
                price: total,
                source: 'quote_confirmation'
            })
            .select()
            .single();

        if (bookingError) throw bookingError;

        // 6. Insert Addons
        if (addonIds.length > 0) {
            const addonInserts = addonIds.map(aid => {
                const addonInfo = addons.find(a => a.id === aid);
                return {
                    booking_id: booking.id,
                    addon_id: aid,
                    price_at_time: addonInfo?.price || 0,
                    quantity: 1
                };
            });
            await supabaseAdmin.from('booking_addons').insert(addonInserts);
        }

        return new Response(JSON.stringify({ success: true, bookingId: booking.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (e: any) {
        console.error("[confirm_quote_booking] Error:", e);
        return new Response(JSON.stringify({ success: false, error: e.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
