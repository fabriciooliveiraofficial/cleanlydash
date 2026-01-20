
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import ICAL from "https://esm.sh/ical.js@1.5.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service Role to bypass RLS for sync
        )

        // 1. Get Calendar ID from Request
        const { calendar_id } = await req.json()
        if (!calendar_id) throw new Error("Missing calendar_id")

        // 2. Fetch Calendar Details
        const { data: calendar, error: calError } = await supabase
            .from('calendars')
            .select('*')
            .eq('id', calendar_id)
            .single()

        if (calError || !calendar) throw new Error("Calendar not found")

        // 3. Fetch ICS File
        console.log(`Fetching ICS from: ${calendar.url}`)
        const response = await fetch(calendar.url)
        if (!response.ok) throw new Error("Failed to fetch ICS file")
        const icsData = await response.text()

        // 4. Parse ICS
        const jcalData = ICAL.parse(icsData);
        const comp = new ICAL.Component(jcalData);
        const vevents = comp.getAllSubcomponents('vevent');

        console.log(`Found ${vevents.length} events`)

        const bookingsToUpsert = []

        for (const event of vevents) {
            const eventComp = new ICAL.Event(event);

            // Skip past events if older than 1 year (optional optimization)
            // For now, keep all.

            bookingsToUpsert.push({
                tenant_id: calendar.tenant_id,
                customer_id: calendar.customer_id,
                calendar_id: calendar.id,
                uid: eventComp.uid,
                summary: eventComp.summary,
                description: eventComp.description,
                start_date: eventComp.startDate.toJSDate(),
                end_date: eventComp.endDate.toJSDate(),
                status: 'confirmed', // Assume confirmed if on calendar
                platform: calendar.name, // e.g. Airbnb
            })
        }

        // 5. Upsert to DB
        // We use 'uid' + 'calendar_id' uniqueness conceptually, but our schema uses 'id' PK.
        // We need to upsert based on 'uid' AND 'calendar_id'.
        // Supabase upsert requires a unique constraint.
        // We should probably add a unique index on (calendar_id, uid) in SQL, but for now we manually check or just delete/insert (simple sync).
        // Better: upsert. But standard upsert relies on PK.
        // Strategy: Delete all future bookings from this calendar and re-insert. (Safest for sync logic to remove cancelled).
        // Or: Loop and upsert one by one matching UID? (Slow).

        // Let's use Delete-Insert for simplicity and correctness (handles cancellations).
        // BUT only for this calendar link.

        // Deleting existing...
        await supabase.from('bookings').delete().eq('calendar_id', calendar_id)

        // Inserting new...
        if (bookingsToUpsert.length > 0) {
            const { error: insertError } = await supabase.from('bookings').insert(bookingsToUpsert)
            if (insertError) throw insertError
        }

        // 6. Update Last Synced
        await supabase.from('calendars').update({ last_synced_at: new Date() }).eq('id', calendar_id)

        return new Response(JSON.stringify({ success: true, count: bookingsToUpsert.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error("Sync Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
