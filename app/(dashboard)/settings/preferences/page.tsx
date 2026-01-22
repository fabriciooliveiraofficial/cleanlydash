// ARQUIVO: app/(dashboard)/settings/preferences/page.tsx
'use client'

import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Moon, Sun, Monitor, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>
            Personalize o visual da plataforma Cleanlydash.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all hover:bg-slate-50",
                theme === 'light' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100"
              )}
            >
              <Sun size={24} className={theme === 'light' ? "text-indigo-600" : "text-slate-400"} />
              <span className="text-xs font-bold uppercase tracking-wider">Claro</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all hover:bg-slate-50",
                theme === 'dark' ? "border-indigo-600 bg-indigo-950/50" : "border-slate-100"
              )}
            >
              <Moon size={24} className={theme === 'dark' ? "text-indigo-400" : "text-slate-400"} />
              <span className="text-xs font-bold uppercase tracking-wider">Escuro</span>
            </button>
            <button
              onClick={() => setTheme('system')}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all hover:bg-slate-50",
                theme === 'system' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-100"
              )}
            >
              <Monitor size={24} className={theme === 'system' ? "text-indigo-600" : "text-slate-400"} />
              <span className="text-xs font-bold uppercase tracking-wider">Sistema</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Idioma e Região</CardTitle>
          <CardDescription>
            Escolha o idioma padrão para a interface do dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label className="flex items-center gap-2">
              <Languages size={14} className="text-indigo-600" />
              Idioma da Plataforma
            </Label>
            <Select defaultValue="pt">
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português (Brasil)</SelectItem>
                <SelectItem value="en">English (International)</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            * Nota: O Cleanlydash utiliza tradução dinâmica. Algumas mensagens do sistema podem aparecer em inglês por padrão.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
