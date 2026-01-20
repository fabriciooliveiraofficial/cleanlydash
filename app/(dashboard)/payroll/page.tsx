// ARQUIVO: app/(dashboard)/payroll/page.tsx
'use client'

import * as React from 'react'
import { previewPayroll, createPayrollRun } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Calculator, 
  ChevronRight, 
  Download, 
  FileText,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function PayrollPage() {
  const [loading, setLoading] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<any>(null)
  const [dates, setDates] = React.useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  const handlePreview = async () => {
    setLoading(true)
    const res = await previewPayroll(dates.start, dates.end)
    setLoading(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      setPreviewData(res)
    }
  }

  const handleGenerate = async () => {
    if (!previewData) return
    setLoading(true)
    const res = await createPayrollRun({
      period_start: previewData.period.start,
      period_end: previewData.period.end,
      total_payout: previewData.total,
      items: previewData.data
    })
    setLoading(false)
    if (res.success) {
      toast.success("Folha gerada como rascunho com sucesso!")
      setPreviewData(null)
    } else {
      toast.error(res.error || "Erro ao gerar folha.")
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Folha de Pagamento</h2>
          <p className="text-slate-500 text-sm">Cálculo de comissões e horas trabalhadas por período.</p>
        </div>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 h-11 px-6 font-bold">
              <Calculator size={18} />
              Rodar Nova Folha
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Configurar Período</DialogTitle>
              <DialogDescription>
                Selecione as datas para calcular os serviços concluídos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start">Data Inicial</Label>
                  <Input 
                    type="date" 
                    id="start" 
                    value={dates.start} 
                    onChange={e => setDates(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end">Data Final</Label>
                  <Input 
                    type="date" 
                    id="end" 
                    value={dates.end}
                    onChange={e => setDates(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handlePreview} 
                disabled={loading}
                className="w-full bg-indigo-600"
              >
                {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Calculator size={16} className="mr-2" />}
                Visualizar Pagamentos
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview Section */}
      {previewData && (
        <Card className="border-indigo-100 shadow-2xl bg-indigo-50/10 animate-in slide-in-from-top-4 duration-500">
          <CardHeader className="flex flex-row items-center justify-between border-b bg-white rounded-t-xl">
            <div>
              <CardTitle className="text-lg font-black text-indigo-900">Prévia da Folha</CardTitle>
              <CardDescription>Período: {new Date(previewData.period.start).toLocaleDateString()} - {new Date(previewData.period.end).toLocaleDateString()}</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Previsto</p>
              <p className="text-2xl font-black text-indigo-600">{formatCurrency(previewData.total)}</p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-indigo-100">
              {previewData.data.map((emp: any) => (
                <div key={emp.profile.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white border-2 border-indigo-200 flex items-center justify-center font-bold text-indigo-600">
                        {emp.profile.full_name?.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">{emp.profile.full_name}</h4>
                        <Badge variant="outline" className="text-[9px] uppercase font-bold text-indigo-500 border-indigo-200">
                          {emp.profile.pay_rate_type}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">{formatCurrency(emp.total)}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pl-12">
                    {emp.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-2 border-b border-indigo-50 last:border-0 group hover:bg-indigo-50/50 rounded px-2 transition-colors">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-700">{it.property}</span>
                          <span className="text-[10px] text-slate-400 italic">{it.description}</span>
                        </div>
                        <span className="font-black text-slate-900">{formatCurrency(it.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-6 border-t bg-white rounded-b-xl flex items-center justify-between">
             <Button variant="ghost" onClick={() => setPreviewData(null)} className="text-slate-400 font-bold">Descartar Prévia</Button>
             <Button onClick={handleGenerate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 px-12 h-11 font-bold">
               {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 size={18} className="mr-2" />}
               Gerar Rascunho da Folha
             </Button>
          </div>
        </Card>
      )}

      {/* Stats Quick View */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-sm bg-indigo-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Aguardando Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-indigo-900">
              {formatCurrency(0)}
            </div>
            <p className="text-[10px] text-indigo-400 mt-1 uppercase font-bold flex items-center gap-1">
              <AlertCircle size={12} /> Próxima remessa: 20/Out
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl border-slate-100 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/30">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText size={18} className="text-slate-400" />
              Histórico de Folhas
            </CardTitle>
            <CardDescription>Registro de todas as remessas processadas.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download size={14} />
            CSV Detalhado
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="w-[180px]">Período</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total Remessa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-slate-400 italic">
                  Nenhuma folha gerada para o ciclo atual.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
