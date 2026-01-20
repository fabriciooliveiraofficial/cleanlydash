
import React from 'react'
import { Bell, Search, Menu, Building2 } from 'lucide-react'
import { Button } from '../ui/button'

export function Header({ tenantName, userName }: { tenantName?: string, userName?: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 w-full items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md md:px-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu size={24} />
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-600">
            <Building2 size={16} />
          </div>
          <h1 className="text-sm font-semibold text-slate-900 truncate max-w-[150px] md:max-w-none">
            {tenantName || 'Minha Empresa'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 md:flex">
          <Search size={16} className="text-slate-500" />
          <input 
            type="text" 
            placeholder="Pesquisar..." 
            className="bg-transparent text-sm outline-none placeholder:text-slate-500 w-48"
          />
        </div>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} className="text-slate-600" />
          <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500"></span>
        </Button>

        <div className="h-8 w-px bg-slate-200 mx-1"></div>

        <button className="relative h-10 w-10 rounded-full p-0 overflow-hidden border border-slate-200">
          <img 
            src={`https://avatar.vercel.sh/${userName || 'user'}`} 
            alt="Avatar" 
            className="h-10 w-10 rounded-full"
          />
        </button>
      </div>
    </header>
  )
}
