// ARQUIVO: app/(dashboard)/invoices/page.tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs"
import {
  FileText,
  MoreHorizontal,
  Mail,
  Download,
  CheckCircle2,
  AlertCircle,
  History,
  Clock,
  ExternalLink,
  Ban,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { CreateInvoiceDialog } from '@/components/invoices/create-invoice-dialog'
import { markInvoiceAsPaid, voidInvoice, sendInvoiceNotification, deleteInvoice } from './actions'

export default async function InvoicesPage() {
  const supabase = createClient()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, customers(name, email)')
    .order('created_at', { ascending: false }) as any

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .eq('status', 'active')

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none font-bold">Pago</Badge>
      case 'sent':
        return <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-none font-bold">Enviado</Badge>
      case 'late':
        return <Badge variant="destructive" className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 shadow-none font-bold animate-pulse">Atrasado</Badge>
      case 'void':
        return <Badge className="bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200 shadow-none font-bold">Cancelada</Badge>
      default:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200 shadow-none font-bold">Rascunho</Badge>
    }
  }

  const InvoiceList = ({ filteredInvoices }: { filteredInvoices: any[] }) => (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50/50">
          <TableHead className="w-[140px] px-6">Fatura #</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Método</TableHead>
          <TableHead>Vencimento</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right px-6">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredInvoices.length > 0 ? (
          filteredInvoices.map((inv) => (
            <TableRow key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
              <TableCell className="font-mono text-[11px] font-black text-slate-400 px-6">
                INV-{inv.id.slice(0, 6).toUpperCase()}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{inv.customers?.name}</span>
                  <span className="text-[10px] text-slate-400">{inv.customers?.email || 'Sem e-mail'}</span>
                </div>
              </TableCell>
              <TableCell className="font-black text-slate-900">
                {formatCurrency(inv.amount)}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-slate-200 text-slate-500">
                  {inv.payment_method || 'N/A'}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-slate-600 font-medium">
                {new Date(inv.due_date).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell>
                {getStatusBadge(inv.status)}
              </TableCell>
              <TableCell className="text-right px-6">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:bg-slate-100 rounded-full transition-all">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl border-slate-200 shadow-xl">
                    <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 px-3 py-2">Gerenciar Fatura</DropdownMenuLabel>
                    <DropdownMenuItem className="gap-2 cursor-pointer py-2.5">
                      <Mail size={14} className="text-slate-400" /> Enviar por E-mail
                    </DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer py-2.5">
                      <Download size={14} className="text-slate-400" /> Baixar PDF
                    </DropdownMenuItem>
                    <form action={async () => { 'use server'; await sendInvoiceNotification(inv.id) }}>
                      <DropdownMenuItem className="gap-2 cursor-pointer py-2.5 text-indigo-600 font-bold" asChild>
                        <button type="submit" className="w-full text-left">
                          <ExternalLink size={14} /> Solicitar Pagamento
                        </button>
                      </DropdownMenuItem>
                    </form>
                    <DropdownMenuSeparator />
                    {inv.status !== 'paid' && (
                      <form action={async () => { 'use server'; await markInvoiceAsPaid(inv.id) }}>
                        <DropdownMenuItem className="gap-2 text-emerald-600 font-bold cursor-pointer py-2.5" asChild>
                          <button type="submit" className="w-full text-left">
                            <CheckCircle2 size={14} /> Marcar como Pago
                          </button>
                        </DropdownMenuItem>
                      </form>
                    )}
                    <form action={async () => { 'use server'; await voidInvoice(inv.id) }}>
                      <DropdownMenuItem className="gap-2 text-rose-600 font-medium cursor-pointer py-2.5" asChild>
                        <button type="submit" className="w-full text-left">
                          <Ban size={14} /> Cancelar Fatura
                        </button>
                      </DropdownMenuItem>
                    </form>
                    <DropdownMenuSeparator />
                    <form action={async () => { 'use server'; await deleteInvoice(inv.id) }}>
                      <DropdownMenuItem className="gap-2 text-rose-700 font-black cursor-pointer py-2.5 bg-rose-50 hover:bg-rose-100" asChild>
                        <button type="submit" className="w-full text-left flex items-center gap-2">
                          <Trash2 size={14} /> Deletar
                        </button>
                      </DropdownMenuItem>
                    </form>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-64 text-center">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="p-4 bg-slate-50 rounded-full">
                  <FileText className="h-10 w-10 text-slate-200" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-900 font-bold">Nenhuma fatura nesta categoria</p>
                  <p className="text-slate-400 text-sm italic">Selecione outra aba ou gere uma nova fatura manual.</p>
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  const receivable = invoices?.filter(i => ['draft', 'sent', 'late'].includes(i.status)) || []
  const paid = invoices?.filter(i => i.status === 'paid') || []
  const totalReceivable = receivable.reduce((acc, curr) => acc + curr.amount, 0)
  const totalPaid = paid.reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Faturamento & Invoicing</h2>
          <p className="text-slate-500 text-sm font-medium">Controle rigoroso de contas a receber e faturas emitidas para proprietários.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2 border-slate-200 h-11 px-6 font-bold shadow-sm rounded-xl">
            <History size={18} />
            Relatórios
          </Button>
          <CreateInvoiceDialog customers={customers || []} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-lg bg-white group hover:shadow-xl transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} /> Total a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
              {formatCurrency(totalReceivable)}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">
              {receivable.length} faturas aguardando liquidação
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={12} /> Total Liquidado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase">
              Faturamento recebido este mês
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white border-t-4 border-t-rose-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-[11px] font-bold text-rose-600 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={12} /> Faturas em Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-rose-600">
              {formatCurrency(invoices?.filter(i => i.status === 'late').reduce((acc, curr) => acc + curr.amount, 0) || 0)}
            </div>
            <p className="text-[10px] text-rose-400 mt-2 font-bold uppercase animate-pulse">
              Requer atenção imediata da cobrança
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-2xl border-slate-100 overflow-hidden rounded-[2rem] bg-white">
        <Tabs defaultValue="receivable" className="w-full">
          <div className="px-8 py-6 border-b bg-slate-50/40 flex items-center justify-between">
            <TabsList className="bg-slate-200/50 p-1.5 rounded-2xl h-12">
              <TabsTrigger value="receivable" className="data-[state=active]:bg-white data-[state=active]:shadow-md gap-2 text-xs font-bold rounded-xl h-9 px-6 transition-all">
                A Receber
                <Badge variant="secondary" className="bg-indigo-600 text-white h-5 px-2 text-[10px] font-black border-none">
                  {receivable.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="paid" className="data-[state=active]:bg-white data-[state=active]:shadow-md gap-2 text-xs font-bold rounded-xl h-9 px-6 transition-all">
                Pagas
              </TabsTrigger>
            </TabsList>

            <div className="hidden md:flex items-center gap-4">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Ações Rápidas:</p>
              <Button variant="ghost" size="sm" className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-colors gap-2">
                Enviar Lembretes <ExternalLink size={14} />
              </Button>
            </div>
          </div>

          <TabsContent value="receivable" className="m-0 focus-visible:ring-0">
            <InvoiceList filteredInvoices={receivable} />
          </TabsContent>
          <TabsContent value="paid" className="m-0 focus-visible:ring-0">
            <InvoiceList filteredInvoices={paid} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}