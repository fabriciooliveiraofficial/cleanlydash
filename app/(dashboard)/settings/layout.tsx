// ARQUIVO: app/(dashboard)/settings/layout.tsx
import React from 'react'
import Link from 'next/link'
import { 
  Building2, 
  Users, 
  CreditCard, 
  Settings2, 
  Puzzle,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

const settingsNav = [
  { label: 'Perfil da Empresa', href: '/dashboard/settings/general', icon: Building2 },
  { label: 'Equipe & Acessos', href: '/dashboard/settings/team', icon: Users },
  { label: 'Financeiro & Planos', href: '/dashboard/settings/billing', icon: CreditCard },
  { label: 'Integrações', href: '/dashboard/settings/integrations', icon: Puzzle },
  { label: 'Preferências', href: '/dashboard/settings/preferences', icon: Settings2 },
]

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h2>
        <p className="text-slate-500">Gerencie os detalhes da sua empresa e preferências de sistema.</p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full shrink-0 md:w-64">
          <nav className="flex flex-row flex-wrap gap-2 md:flex-col">
            {settingsNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-slate-100 text-slate-600"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={18} className="text-slate-400" />
                  {item.label}
                </div>
                <ChevronRight size={14} className="hidden md:block opacity-30" />
              </Link>
            ))}
          </nav>
        </aside>
        
        <div className="flex-1 max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  )
}
