
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
)

async function check() {
    const { data: settings, error } = await supabase.from('telnyx_settings').select('user_id, api_key, phone_number')
    console.log("Telnyx Settings Rows:", settings?.length)
    settings?.forEach(s => {
        console.log(`User: ${s.user_id}, Phone: ${s.phone_number}, KeyPrefix: ${s.api_key?.substring(0, 10)}, KeyLen: ${s.api_key?.length}`)
    })

    const { data: platform, error: pError } = await supabase.from('platform_settings').select('key, value')
    console.log("Platform Settings Rows:", platform?.length)
    platform?.forEach(p => {
        if (p.key.includes('KEY')) {
            console.log(`Key: ${p.key}, ValuePrefix: ${p.value?.substring(0, 10)}, ValueLen: ${p.value?.length}`)
        }
    })
}

check()
