// ARQUIVO: components/calendar/dispatch-view.tsx
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet"
// Added missing Button import
import { Button } from '@/components/ui/button'
import { 
  User, 
  Clock, 
  MapPin, 
  ExternalLink, 
  ChevronRight,
  ClipboardList
} from 'lucide-react'

interface TeamMember {
  id: string;
  full_name: string;
  role: string;
  calendar_color: string;
}

interface Booking {
  id: string;
  property_name: string;
  start_time: string;
  status: string;
  price: number;
  assigned_cleaners: string[];
  customers?: { name: string };
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 8) // 8am to 6pm

export function DispatchView({ bookings, team }: { bookings: Booking[], team: TeamMember[] }) {
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)

  // Filtra agendamentos para um funcionário específico
  const getBookingsForMember = (memberId: string) => {
    return bookings.filter(b => b.assigned_cleaners?.includes(memberId))
  }

  // Calcula posição X com base na hora de início (simplificado)
  const getXPosition = (startTimeStr: string) => {
    const time = new Date(startTimeStr)
    const hours = time.getHours() + time.getMinutes() / 60
    const startHour = 8
    const hourWidth = 100 // pixels por hora
    return Math.max(0, (hours - startHour) * hourWidth)
  }

  return (
    <div className="h-full flex flex-col rounded-2xl border bg-white shadow-xl overflow-hidden">
      {/* Timeline Header */}
      <div className="flex border-b bg-slate-50/80 sticky top-0 z-20">
        <div className="w-56 p-4 border-r font-bold text-xs text-slate-500 uppercase tracking-widest shrink-0 bg-white">
          Equipe / Recursos
        </div>
        <div className="flex flex-1 overflow-x-auto no-scrollbar">
          {HOURS.map(hour => (
            <div key={hour} className="min-w-[100px] flex-1 p-3 text-center border-r last:border-0 border-slate-200">
              <span className="text-[10px] font-black text-slate-400">
                {hour}:00
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {team.map(member => (
          <div key={member.id} className="flex border-b last:border-0 hover:bg-slate-50/30 transition-colors group">
            {/* User Column */}
            <div className="w-56 p-4 border-r shrink-0 flex items-center gap-3 bg-white group-hover:bg-slate-50/50 transition-colors">
              <div 
                className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                style={{ backgroundColor: member.calendar_color || '#4f46e5' }}
              >
                {member.full_name?.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]">
                  {member.full_name}
                </span>
                <span className="text-[10px] font-medium text-slate-500 uppercase">
                  {member.role}
                </span>
              </div>
            </div>

            {/* Time Slot Area */}
            <div className="flex-1 relative h-20 min-w-[1100px] bg-grid-slate-100">
              {/* Background Grid Lines */}
              <div className="absolute inset-0 flex">
                {HOURS.map(h => (
                  <div key={h} className="flex-1 border-r border-slate-100 last:border-0" />
                ))}
              </div>

              {/* Booking Cards */}
              {getBookingsForMember(member.id).map(booking => (
                <button
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className="absolute top-3 h-14 rounded-xl border-l-4 p-2.5 text-left shadow-sm transition-all hover:scale-[1.02] hover:shadow-md z-10"
                  style={{ 
                    left: `${getXPosition(booking.start_time)}px`,
                    width: '180px', // Largura padrão para jobs de 2h
                    backgroundColor: `${member.calendar_color}10`, // 10% opacity bg
                    borderColor: member.calendar_color || '#4f46e5'
                  }}
                >
                  <div className="flex flex-col h-full justify-between">
                    <span className="text-[11px] font-bold text-slate-900 truncate leading-none">
                      {booking.property_name}
                    </span>
                    <div className="flex items-center justify-between text-[9px] font-medium text-slate-500 uppercase">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="font-bold text-indigo-600">R${booking.price}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Booking Details Sheet */}
      <Sheet open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="mb-8">
            <SheetTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="text-indigo-600" />
              Detalhes do Job
            </SheetTitle>
          </SheetHeader>
          
          {selectedBooking && (
            <div className="space-y-8">
              <div className="p-4 rounded-2xl bg-slate-50 border space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Imóvel / Unidade</p>
                  <h3 className="text-xl font-bold text-slate-900">{selectedBooking.property_name}</h3>
                </div>
                <div className="flex items-center gap-2 text-indigo-600 font-bold bg-white p-2 rounded-lg border shadow-sm">
                  <User size={18} />
                  {selectedBooking.customers?.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-white flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Horário</span>
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <Clock size={16} className="text-amber-500" />
                    {new Date(selectedBooking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="p-4 rounded-xl border bg-white flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento</span>
                  <div className="flex items-center gap-2 font-bold text-emerald-600">
                    R$ {selectedBooking.price}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Localização</p>
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <MapPin size={18} className="text-rose-500 shrink-0" />
                  Rua das Orquídeas, 402 - Centro, São Paulo
                </div>
              </div>

              <div className="pt-8 border-t space-y-3">
                <Button className="w-full bg-indigo-600 gap-2 h-12 shadow-lg shadow-indigo-100">
                  <ExternalLink size={18} />
                  Abrir Checklist do Imóvel
                </Button>
                <Button variant="outline" className="w-full h-12 gap-2">
                  Reatribuir Funcionário
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
