'use client'

import React from 'react'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Settings,
  LogOut,
  Plane,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  Receipt,
  FileText,
  LayoutGrid
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { signOut } from '../../app/(auth)/actions'
import { usePermissions } from '../../hooks/use-permissions'
import { LanguageSwitcher } from './language-switcher'

export function Sidebar() {
  const { role, isOwner, isManager, isCleaner, isLoading } = usePermissions()

  const menuItems = [
    {
      id: 'overview',
      icon: LayoutDashboard,
      label: 'Dashboard',
      href: '/dashboard',
      visible: true
    },
    {
      id: 'calendar',
      icon: Calendar,
      label: 'Agenda Operacional',
      href: '/dashboard/calendar',
      visible: true
    },
    {
      id: 'airbnb',
      icon: LayoutGrid,
      label: 'Airbnb Center',
      href: '/airbnb-center',
      visible: true
    },
    {
      id: 'my-jobs',
      icon: ClipboardCheck,
      label: 'Meus Jobs',
      href: '/dashboard/jobs',
      visible: isCleaner
    },
    {
      id: 'customers',
      icon: Users,
      label: 'Clientes CRM',
      href: '/dashboard/customers',
      visible: isManager
    },
    {
      id: 'invoicing',
      icon: FileText,
      label: 'Faturamento',
      href: '/dashboard/invoices',
      visible: isManager
    },
    {
      id: 'payroll',
      icon: Receipt,
      label: 'Folha de Pagamento',
      href: '/dashboard/payroll',
      visible: isManager
    },
    {
      id: 'wallet',
      icon: Wallet,
      label: 'Financeiro',
      href: '/dashboard/wallet',
      visible: isOwner
    },
  ]

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center border-b border-slate-100 px-6 justify-between">
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-sm">
            <Plane size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 uppercase">AirGoverness</span>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-slate-50">
        <LanguageSwitcher />
      </div>

      <div className="flex-1 px-4 py-6 space-y-8 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <div>
            <p className="px-2 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Menu Operacional
            </p>
            <nav className="space-y-1">
              {menuItems
                .filter(item => item.visible)
                .map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                      "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={cn(
                        "transition-colors",
                        "text-slate-400 group-hover:text-slate-600"
                      )} />
                      {item.label}
                    </div>
                  </Link>
                ))}
            </nav>
          </div>
        )}

        {isOwner && (
          <div>
            <p className="px-2 mb-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Configurações
            </p>
            <nav className="space-y-1">
              <button
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <Settings size={18} className="text-slate-400" />
                Ajustes da Empresa
              </button>
            </nav>
          </div>
        )}
      </div>

      <div className="mt-auto border-t border-slate-100 p-4 space-y-1 bg-slate-50/30">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut size={18} />
          Sair do Sistema
        </button>
      </div>
    </aside>
  )
}
