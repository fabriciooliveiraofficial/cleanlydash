
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

async function check() {
    console.log("Checking smtp_settings table...")
    const { data: settings, error } = await supabase.from('smtp_settings').select('*')

    if (error) {
        console.error("Error fetching smtp_settings:", error)
        return
    }

    console.log("Total SMTP Settings Rows:", settings?.length)
    settings?.forEach(s => {
        console.log(`User ID: ${s.user_id}`)
        console.log(`Host: ${s.host}`)
        console.log(`From: ${s.from_email}`)
        console.log(`Active: ${s.is_active}`)
        console.log("---")
    })

    const { data: users, error: uError } = await supabase.auth.admin.listUsers()
    if (uError) {
        console.error("Error listing users:", uError)
    } else {
        console.log("Recent Users:")
        users.users.slice(0, 5).forEach(u => {
            console.log(`Email: ${u.email}, ID: ${u.id}`)
        })
    }
}

check()
