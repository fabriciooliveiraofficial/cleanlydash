// ARQUIVO: app/(dashboard)/settings/integrations/page.tsx
'use client'

import * as React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plane, 
  Sparkles, 
  PhoneCall, 
  Calendar, 
  Info,
  ExternalLink
} from 'lucide-react'

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Canais de Venda</CardTitle>
              <CardDescription>Sincronize calendários externos para automatizar turnovers.</CardDescription>
            </div>
            <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-100">Sync Ativo</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between p-4 rounded-xl border bg-slate-50/50">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <Calendar size={20} />
              </div>
              <div>
                <Label className="text-base font-bold text-slate-900">Airbnb iCal Connector</Label>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Importa reservas automaticamente via URL do calendário exportado do Airbnb.</p>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs">
            <Info size={14} />
            Lembre-se: O iCal do Airbnb pode ter um atraso de até 2 horas para atualizar.
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Power-Ups (IA & Telecom)</CardTitle>
          <CardDescription>Turbine sua operação com recursos inteligentes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between p-4 rounded-xl border">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <Label className="text-base font-bold text-slate-900">OpenAI Concierge</Label>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Utiliza GPT-4 para transcrever áudios de checklists e gerar relatórios de limpeza automáticos.</p>
                <div className="mt-2 text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">Custo: R$ 0,10 / uso</div>
              </div>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-start justify-between p-4 rounded-xl border">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <PhoneCall size={20} />
              </div>
              <div>
                <Label className="text-base font-bold text-slate-900">Telnyx Voice Engine</Label>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Telefonia via VoIP integrada para ligações entre equipe e suporte. Requer saldo na Wallet.</p>
                <Badge variant="secondary" className="mt-2 text-[10px]">+1 (555) 123-4567</Badge>
              </div>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
