// ARQUIVO: lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '../../types/supabase.ts'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jjbokilvurxztqiwvxhy.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYm9raWx2dXJ4enRxaXd2eGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTYxMjYsImV4cCI6MjA4MzM3MjEyNn0.6XrV6S665pYDibo4RA52ddb-JCTk7jyikwgxs2lpTRs';

/**
 * Singleton Supabase client instance for browser environments.
 * This ensures session state is shared across all components.
 */
let supabaseInstance: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and Anon Key are required. Check your .env.local or hardcoded fallbacks.");
  }

  // Return existing instance if available (singleton pattern)
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Create new instance only on first call
  supabaseInstance = createBrowserClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  );

  return supabaseInstance;
}