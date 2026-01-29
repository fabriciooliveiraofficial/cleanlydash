import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function notifyRelease() {
    const version = `v${new Date().toISOString().split('T')[0]}.${Math.floor(Date.now() / 1000).toString().slice(-4)}`;
    console.log(`[ReleaseGuard] 🚀 Sending broadcast for version: ${version}...`);

    const channel = supabase.channel('app-releases');

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            const result = await channel.send({
                type: 'broadcast',
                event: 'new_release',
                payload: {
                    version,
                    message: 'Uma nova atualização do Cleanlydash foi publicada automaticamente. Clique em atualizar para carregar as melhorias!',
                    timestamp: new Date().toISOString()
                }
            });

            if (result === 'ok') {
                console.log('✅ Success: Release broadcast sent to all users.');
            } else {
                console.error('❌ Error: Failed to send broadcast.', result);
            }

            // Give it a moment to send before exiting
            setTimeout(() => process.exit(0), 1000);
        }

        if (status === 'CHANNEL_ERROR') {
            console.error('❌ Error: Could not connect to Supabase Realtime.');
            process.exit(1);
        }
    });
}

notifyRelease().catch(err => {
    console.error('❌ Fatal Error:', err);
    process.exit(1);
});
