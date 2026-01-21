// ARQUIVO: components/calendar/dispatch-timeline.tsx
'use client'

import React from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Clock,
  MapPin,
  ChevronRight,
  ExternalLink,
  DollarSign,
  ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Employee {
  id: string
  full_name: string
  role: string
  calendar_color: string
}

interface Booking {
  id: string
  property_name: string
  start_time: string
  end_time?: string | null
  status: string
  price: number
  resource_ids: string[]
  customers?: { name: string }
}

interface DispatchTimelineProps {
  date: Date
  employees: Employee[]
  bookings: Booking[]
  onBookingUpdate?: (bookingId: string, updates: Partial<Booking>) => void
}

const START_HOUR = 8
const END_HOUR = 18
const HOUR_WIDTH = 120 // pixels per hour
const SLOT_DURATION = 30 // minutes

export function DispatchTimeline({ date, employees, bookings, onBookingUpdate }: DispatchTimelineProps) {
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  const getXPosition = (timeStr: string) => {
    const time = new Date(timeStr)
    const hour = time.getHours()
    const minutes = time.getMinutes()

    const relativeHour = hour - START_HOUR
    return (relativeHour * HOUR_WIDTH) + (minutes / 60 * HOUR_WIDTH)
  }

  const getWidth = (startStr: string, endStr?: string | null) => {
    const start = new Date(startStr)
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 2 * 60 * 60 * 1000) // Default 2h if null

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    return durationHours * HOUR_WIDTH
  }

  const [draggedBooking, setDraggedBooking] = React.useState<Booking | null>(null)
  const [dragOverMember, setDragOverMember] = React.useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, booking: Booking) => {
    setDraggedBooking(booking)
    e.dataTransfer.setData('bookingId', booking.id)
    e.dataTransfer.effectAllowed = 'move'

    // Add custom drag image or styling if needed
    const ghost = e.currentTarget as HTMLElement
    ghost.style.opacity = '0.4'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement
    target.style.opacity = '1'
    setDraggedBooking(null)
    setDragOverMember(null)
  }

  const handleDragOver = (e: React.DragEvent, memberId: string) => {
    e.preventDefault()
    setDragOverMember(memberId)
  }

  const handleDrop = (e: React.DragEvent, memberId: string) => {
    e.preventDefault()
    if (!draggedBooking || !onBookingUpdate) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left

    // Calculate new time based on X position
    const totalMinutesSinceStart = (x / HOUR_WIDTH) * 60
    const newDate = new Date(date)
    newDate.setHours(START_HOUR, totalMinutesSinceStart, 0, 0)

    onBookingUpdate(draggedBooking.id, {
      resource_ids: [memberId],
      start_time: newDate.toISOString()
    })

    setDraggedBooking(null)
    setDragOverMember(null)
  }

  const [resizingBooking, setResizingBooking] = React.useState<{ id: string, initialX: number, initialWidth: number } | null>(null)

  const handleResizeStart = (e: React.MouseEvent, bookingId: string, currentWidth: number) => {
    e.stopPropagation()
    e.preventDefault()
    setResizingBooking({
      id: bookingId,
      initialX: e.clientX,
      initialWidth: currentWidth
    })
  }

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingBooking) return

      const deltaX = e.clientX - resizingBooking.initialX
      const newWidth = Math.max(HOUR_WIDTH * 0.5, resizingBooking.initialWidth + deltaX) // Min 30 min duration

      // Select the booking element to update width visually for smoother feel
      const element = document.getElementById(`booking-${resizingBooking.id}`)
      if (element) {
        element.style.width = `${newWidth}px`
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!resizingBooking) return

      const deltaX = e.clientX - resizingBooking.initialX
      const finalWidth = Math.max(HOUR_WIDTH * 0.5, resizingBooking.initialWidth + deltaX)

      const booking = bookings.find(b => b.id === resizingBooking.id)
      if (booking && onBookingUpdate) {
        const start = new Date(booking.start_time)
        const durationHours = finalWidth / HOUR_WIDTH
        const newEnd = new Date(start.getTime() + durationHours * 60 * 60 * 1000)

        onBookingUpdate(booking.id, {
          end_time: newEnd.toISOString()
        })
      }

      setResizingBooking(null)
    }

    if (resizingBooking) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingBooking, bookings, onBookingUpdate])

  return (
    <div className="relative flex flex-col h-full bg-white border rounded-2xl shadow-xl overflow-hidden">
      {/* Timeline Header */}
      <div className="flex border-b bg-slate-50/80 sticky top-0 z-30">
        <div className="w-56 p-4 border-r shrink-0 font-bold text-xs text-slate-500 uppercase tracking-widest bg-white">
          Equipe Operacional
        </div>
        <div className="flex flex-1 overflow-x-auto no-scrollbar scroll-smooth">
          {hours.map(hour => (
            <div key={hour} className="min-w-[120px] p-3 text-center border-r last:border-0 border-slate-200">
              <span className="text-[10px] font-black text-slate-400">
                {hour}:00
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {employees.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            Nenhum funcionário ativo encontrado para este Tenant.
          </div>
        ) : (
          employees.map(member => {
            const memberBookings = bookings.filter(b => b.resource_ids?.includes(member.id))

            return (
              <div key={member.id} className="flex border-b last:border-0 group hover:bg-slate-50/30 transition-colors">
                {/* Fixed Resource Column */}
                <div className="w-56 p-4 border-r shrink-0 flex items-center gap-3 bg-white sticky left-0 z-20 group-hover:bg-slate-50/50 transition-colors">
                  <div
                    className="h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-white"
                    style={{ backgroundColor: member.calendar_color || '#4f46e5' }}
                  >
                    {member.full_name?.charAt(0)}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {member.full_name}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                      {member.role === 'cleaner' ? 'Diarista' : 'Supervisor'}
                    </span>
                  </div>
                </div>

                {/* Timeline Row Area */}
                <div
                  className={cn(
                    "flex-1 relative h-24 min-w-[1200px] bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)] bg-[size:60px_100%] transition-colors",
                    dragOverMember === member.id && "bg-indigo-50/50 ring-2 ring-indigo-400 ring-inset"
                  )}
                  onDragOver={(e) => handleDragOver(e, member.id)}
                  onDrop={(e) => handleDrop(e, member.id)}
                >
                  {/* Event Blocks */}
                  {memberBookings.map(booking => {
                    const left = getXPosition(booking.start_time)
                    const width = getWidth(booking.start_time, booking.end_time)

                    return (
                      <div
                        key={booking.id}
                        id={`booking-${booking.id}`}
                        draggable={!resizingBooking}
                        onDragStart={(e) => handleDragStart(e, booking)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedBooking(booking)}
                        className="absolute top-4 h-16 rounded-xl border-l-4 p-2.5 text-left shadow-lg transition-all hover:scale-[1.02] hover:z-40 active:scale-95 z-10 cursor-grab active:cursor-grabbing group/booking"
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          backgroundColor: `${member.calendar_color}15`,
                          borderColor: member.calendar_color || '#4f46e5',
                          color: member.calendar_color || '#4f46e5'
                        }}
                      >
                        <div className="flex flex-col h-full justify-between overflow-hidden relative">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-black uppercase truncate">
                              {booking.property_name}
                            </span>
                            <Badge className="h-4 px-1 text-[8px] uppercase font-bold" variant="outline" />
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-bold opacity-80">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="bg-white/50 px-1 rounded">R${booking.price}</span>
                          </div>

                          {/* Resize Handle */}
                          <div
                            onMouseDown={(e) => handleResizeStart(e, booking.id, width)}
                            className="absolute -right-2.5 top-0 bottom-0 w-5 cursor-ew-resize flex items-center justify-center group-hover/booking:opacity-100 opacity-0 transition-opacity"
                          >
                            <div className="w-1 h-8 bg-current opacity-30 rounded-full" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Booking Detail Sidebar */}
      <Sheet open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <ClipboardList size={20} />
              </div>
              <SheetTitle className="text-xl font-bold">Detalhamento do Job</SheetTitle>
            </div>
            <SheetDescription>Gerencie o status e a equipe deste turnover.</SheetDescription>
          </SheetHeader>

          {selectedBooking && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Imóvel</p>
                  <h3 className="text-lg font-black text-slate-900">{selectedBooking.property_name}</h3>
                  <div className="mt-4 flex items-center gap-2 text-indigo-600 font-bold bg-white p-2.5 rounded-xl border shadow-sm">
                    <User size={18} />
                    {selectedBooking.customers?.name || 'Cliente Particular'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border bg-white flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Horário</span>
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                      <Clock size={16} className="text-amber-500" />
                      {new Date(selectedBooking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl border bg-white flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Faturamento</span>
                    <div className="flex items-center gap-2 font-bold text-emerald-600">
                      <DollarSign size={16} />
                      {selectedBooking.price.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Localização</p>
                  <div className="flex items-start gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl">
                    <MapPin size={18} className="text-rose-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">Endereço sincronizado via CRM (Photon API)</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t space-y-3">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 shadow-lg gap-2 font-bold">
                  <ExternalLink size={18} />
                  Abrir Checklist Operacional
                </Button>
                <Button variant="outline" className="w-full h-12 gap-2 border-slate-200">
                  Reatribuir Funcionário
                  <ChevronRight size={16} />
                </Button>
                <Button variant="ghost" className="w-full h-12 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold">
                  Cancelar Turnover
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
