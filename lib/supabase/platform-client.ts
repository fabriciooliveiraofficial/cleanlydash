// ARQUIVO: lib/supabase/platform-client.ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/supabase.ts'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jjbokilvurxztqiwvxhy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYm9raWx2dXJ4enRxaXd2eGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTYxMjYsImV4cCI6MjA4MzM3MjEyNn0.6XrV6S665pYDibo4RA52ddb-JCTk7jyikwgxs2lpTRs';

let platformClientInstance: any = null;

export function createPlatformClient() {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Supabase URL and Anon Key are required.");
    }

    if (platformClientInstance) {
        return platformClientInstance;
    }

    console.log(' initializing Platform Client with sessionStorage...');

    platformClientInstance = createSupabaseClient<Database>(
        supabaseUrl,
        supabaseKey,
        {
            auth: {
                storageKey: 'sb-platform-auth-token', // ISOLATED STORAGE KEY
                storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        }
    );

    return platformClientInstance;
}
