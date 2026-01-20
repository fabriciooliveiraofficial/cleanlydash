// ARQUIVO: components/auth/role-gate.tsx
'use client'

import { usePermissions, UserRole } from '@/hooks/use-permissions'
import React from 'react'

interface RoleGateProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function RoleGate({ children, allowedRoles }: RoleGateProps) {
  const { role, isLoading } = usePermissions()

  if (isLoading) return null

  if (!role || !allowedRoles.includes(role)) {
    return null
  }

  return <>{children}</>
}
