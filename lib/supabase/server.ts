// ARQUIVO: lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

/**
 * Cliente Supabase para uso em Server Components, Server Actions e API Routes.
 */
export function createClient() {
  const cookieStore = cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jjbokilvurxztqiwvxhy.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYm9raWx2dXJ4enRxaXd2eGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTYxMjYsImV4cCI6MjA4MzM3MjEyNn0.6XrV6S665pYDibo4RA52ddb-JCTk7jyikwgxs2lpTRs';

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Silencia erro se chamado em Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Silencia erro se chamado em Server Component
          }
        },
      },
      cookieOptions: {
        name: 'sb-tenant-auth-token',
        lifetime: 60 * 60 * 24 * 365,
        domain: '',
        path: '/',
        sameSite: 'lax'
      }
    }
  )
}