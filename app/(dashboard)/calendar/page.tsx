// ARQUIVO: app/(dashboard)/calendar/page.tsx
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from '@/components/booking/kanban-board'
import { DispatchTimeline } from '@/components/calendar/dispatch-timeline'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Filter, 
  LayoutGrid, 
  ListTodo, 
  Map as MapIcon,
  Search
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { BookingForm } from './booking-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from 'next/link'

export default async function CalendarPage({ searchParams }: { searchParams: { view?: string } }) {
  const supabase = createClient()
  const activeView = searchParams.view || 'dispatch'

  // Busca agendamentos com dados dos clientes unidos
  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, customers(name)')
    .order('start_time', { ascending: true })

  // Busca clientes ativos para o formulário
  const { data: customers } = await supabase
    .from('customers')
    .select('id, name')
    .eq('status', 'active')

  // Busca equipe (Cleaners e Managers) para o Dispatch View
  const { data: team } = await supabase
    .from('profiles')
    .select('id, full_name, role, calendar_color')
    .in('role', ['cleaner', 'manager', 'owner'])
    .order('full_name', { ascending: true })

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-6 overflow-hidden">
      {/* Header Operational */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex flex-col">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Agenda Operacional</h2>
          <p className="text-slate-500 text-sm font-medium">Controle de turnover e logística de campo.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar job..." 
              className="pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-48 bg-white"
            />
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 h-11 px-6 font-bold rounded-xl transition-all active:scale-95">
                <Plus size={20} />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Agendar Turnover</DialogTitle>
              </DialogHeader>
              <BookingForm customers={customers || []} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue={activeView} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between mb-4 bg-white p-1.5 rounded-2xl border shadow-sm shrink-0 gap-2">
          <TabsList className="bg-slate-100/50 border-none p-1 rounded-xl">
            <Link href="/dashboard/calendar?view=dispatch">
              <TabsTrigger value="dispatch" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 h-9 px-4 rounded-lg font-bold text-xs">
                <LayoutGrid size={14} className="text-indigo-600" />
                Dispatch
              </TabsTrigger>
            </Link>
            <Link href="/dashboard/calendar?view=kanban">
              <TabsTrigger value="kanban" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 h-9 px-4 rounded-lg font-bold text-xs">
                <ListTodo size={14} className="text-emerald-600" />
                Kanban
              </TabsTrigger>
            </Link>
            <Link href="/dashboard/calendar?view=map">
              <TabsTrigger value="map" className="data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 h-9 px-4 rounded-lg font-bold text-xs">
                <MapIcon size={14} className="text-rose-600" />
                Mapa
              </TabsTrigger>
            </Link>
          </TabsList>
          
          <div className="flex items-center gap-1.5 px-3 border-l ml-auto">
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">Dia</Button>
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-indigo-700 bg-indigo-50 rounded-lg">Semana</Button>
            <Button variant="ghost" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">Mês</Button>
            <div className="h-6 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg border-slate-200 text-slate-500">
              <Filter size={14} />
            </Button>
          </div>
        </div>

        <TabsContent value="dispatch" className="flex-1 min-h-0 mt-0 focus-visible:ring-0">
          <DispatchTimeline 
            date={new Date()} 
            employees={(team || []) as any} 
            bookings={(bookings || []) as any} 
          />
        </TabsContent>

        <TabsContent value="kanban" className="flex-1 min-h-0 mt-0 focus-visible:ring-0">
          {bookings && bookings.length > 0 ? (
            <KanbanBoard initialBookings={bookings} />
          ) : (
            <EmptyCalendarState />
          )}
        </TabsContent>

        <TabsContent value="map" className="flex-1 min-h-0 mt-0">
          <div className="h-full rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
             <MapIcon size={48} className="mb-4 opacity-20" />
             <p className="font-bold text-slate-500">Geolocalização em Tempo Real</p>
             <p className="text-xs max-w-xs mt-2">Estamos integrando com a API do Google Maps para exibir a rota otimizada dos seus cleaners.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyCalendarState() {
  return (
    <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-200 rounded-3xl bg-white p-12 text-center">
      <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
        <CalendarIcon size={40} />
      </div>
      <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sem Turnover Hoje</h3>
      <p className="text-slate-500 max-w-sm mt-2 text-sm">Sua agenda está livre! Comece adicionando um novo agendamento de limpeza pelo botão superior.</p>
    </div>
  )
}
