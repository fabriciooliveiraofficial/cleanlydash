// ARQUIVO: hooks/use-permissions.ts
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'owner' | 'manager' | 'cleaner' | null

export function usePermissions() {
  const [role, setRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setRole(profile?.role || null)
      setIsLoading(false)
    }

    getProfile()
  }, [])

  return {
    role,
    isLoading,
    isOwner: role === 'owner',
    isManager: role === 'manager' || role === 'owner',
    isCleaner: role === 'cleaner'
  }
}
