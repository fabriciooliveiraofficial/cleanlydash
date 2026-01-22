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
import { parseISO, differenceInMinutes, startOfDay, setHours, addMinutes } from 'date-fns'

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
const SLOT_DURATION = 10 // Precision changed to 10 minutes
const SNAP_PIXELS = (SLOT_DURATION / 60) * HOUR_WIDTH // 20px for 10min snap

export function DispatchTimeline({ date, employees, bookings, onBookingUpdate }: DispatchTimelineProps) {
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  const getXPosition = (timeStr: string) => {
    const start = parseISO(timeStr)
    const viewStart = setHours(startOfDay(date), START_HOUR)
    const diff = differenceInMinutes(start, viewStart)
    return (diff / 60) * HOUR_WIDTH
  }

  const getWidth = (startStr: string, endStr?: string | null) => {
    const start = new Date(startStr)
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 2 * 60 * 60 * 1000) // Default 2h if null

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    return durationHours * HOUR_WIDTH
  }

  // Interaction State
  const [interaction, setInteraction] = React.useState<{
    type: 'drag' | 'resize'
    bookingId: string
    startX: number
    startY: number
    initialLeft: number
    initialWidth: number
    initialResource: string
    currentX: number
    currentY: number
    resizeSide?: 'left' | 'right'
  } | null>(null)

  const rowRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())

  const handlePointerDown = (e: React.PointerEvent, booking: Booking, type: 'drag' | 'resize', side?: 'left' | 'right') => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const left = getXPosition(booking.start_time)
    const width = getWidth(booking.start_time, booking.end_time)

    setInteraction({
      type,
      bookingId: booking.id,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: left,
      initialWidth: width,
      initialResource: booking.resource_ids[0] || '', // Assuming single resource for now
      currentX: e.clientX,
      currentY: e.clientY,
      resizeSide: side
    })
  }

  React.useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!interaction) return
      e.preventDefault()

      setInteraction(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!interaction) return
      e.preventDefault()

      const deltaX = e.clientX - interaction.startX
      const booking = bookings.find(b => b.id === interaction.bookingId)

      if (booking && onBookingUpdate) {
        if (interaction.type === 'resize') {
          // Resize Logic
          if (interaction.resizeSide === 'right') {
            const rawNewWidth = interaction.initialWidth + deltaX
            const snappedWidth = Math.max(HOUR_WIDTH * (SLOT_DURATION / 60), Math.round(rawNewWidth / SNAP_PIXELS) * SNAP_PIXELS)
            const durationHours = snappedWidth / HOUR_WIDTH

            const start = parseISO(booking.start_time)
            const newEnd = new Date(start.getTime() + durationHours * 60 * 60 * 1000)

            onBookingUpdate(booking.id, { end_time: newEnd.toISOString() })
          } else {
            const resultWidth = interaction.initialWidth - deltaX
            // Snap delta
            const snappedDelta = Math.round(deltaX / SNAP_PIXELS) * SNAP_PIXELS
            // Limit so width doesn't go negative
            const finalDelta = Math.min(snappedDelta, interaction.initialWidth - (HOUR_WIDTH * (SLOT_DURATION / 60)))

            const start = parseISO(booking.start_time)
            const viewStart = setHours(startOfDay(date), START_HOUR)
            // Current minutes relative to start
            const currentMins = differenceInMinutes(start, viewStart)
            const addedMins = (finalDelta / HOUR_WIDTH) * 60

            const newStart = addMinutes(start, addedMins)
            // End stays same
            const end = booking.end_time ? parseISO(booking.end_time) : addMinutes(start, 60) // shouldn't happen if width maintained

            onBookingUpdate(booking.id, { start_time: newStart.toISOString() })
          }
        } else {
          // Drag Logic
          const snappedDelta = Math.round(deltaX / SNAP_PIXELS) * SNAP_PIXELS

          // Time Update
          const start = parseISO(booking.start_time)
          const addedMins = (snappedDelta / HOUR_WIDTH) * 60
          const newStart = addMinutes(start, addedMins)

          const duration = differenceInMinutes(booking.end_time ? parseISO(booking.end_time) : addMinutes(start, 120), start)
          const newEnd = addMinutes(newStart, duration)

          // Resource Update (Row Detection)
          let newResourceId = interaction.initialResource

          // Find which row contains the pointer
          if (rowRefs.current) {
            rowRefs.current.forEach((el, id) => {
              const rect = el.getBoundingClientRect()
              if (e.clientY >= rect.top && e.clientY <= rect.bottom) {
                newResourceId = id
              }
            })
          }

          onBookingUpdate(booking.id, {
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString(),
            resource_ids: [newResourceId]
          })
        }
      }

      setInteraction(null)
    }

    if (interaction) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [interaction, bookings, onBookingUpdate, date])

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
            const isDraggingOver = interaction?.type === 'drag' &&
              // We can't know dragOverMember easily in pointermove without complexity, 
              // so simple hover visualization is skipped during drag for now, 
              // or we could use the calculated newResourceId if we put it in state.
              // Simplification: No highlight or implement separate state?
              // Actually, we can check row refs in render? No, too slow.
              // Let's iterate row detection in move handler and store "hoverRow" in state if visual is needed.
              // For now, clean UI > perf.
              false

            return (
              <div key={member.id} className="flex border-b last:border-0 hover:bg-slate-50/30 transition-colors">
                {/* Fixed Resource Column */}
                <div className="w-56 p-4 border-r shrink-0 flex items-center gap-3 bg-white sticky left-0 z-20">
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
                  ref={el => {
                    if (el) rowRefs.current.set(member.id, el)
                    else rowRefs.current.delete(member.id)
                  }}
                  className={cn(
                    "flex-1 relative h-24 min-w-[1200px] bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)] bg-[size:20px_100%] transition-colors touch-none"
                  )}
                >
                  {/* Event Blocks */}
                  {memberBookings.map(booking => {
                    const isInteracting = interaction?.bookingId === booking.id

                    // Base geometry
                    let left = getXPosition(booking.start_time)
                    let width = getWidth(booking.start_time, booking.end_time)

                    // Optimistic geometry during interaction
                    let top = 16 // top-4 equivalent
                    let zIndex = 10
                    let shadow = 'shadow-lg'

                    if (isInteracting) {
                      zIndex = 50
                      shadow = 'shadow-2xl ring-2 ring-indigo-400/50'
                      const deltaX = interaction.currentX - interaction.startX
                      const deltaY = interaction.currentY - interaction.startY

                      if (interaction.type === 'resize') {
                        if (interaction.resizeSide === 'right') {
                          width = Math.max(HOUR_WIDTH * (SLOT_DURATION / 60), width + deltaX)
                        } else {
                          const oldLeft = left
                          left = left + deltaX
                          width = Math.max(HOUR_WIDTH * (SLOT_DURATION / 60), width - deltaX)
                        }
                      } else {
                        // Drag
                        left += deltaX
                        top += deltaY // Visualize vertical movement
                      }
                    }

                    const statusColors: any = {
                      confirmed: { bg: '#ecfdf5', border: '#10b981', text: '#064e3b' },
                      pending: { bg: '#fffbeb', border: '#f59e0b', text: '#78350f' },
                      completed: { bg: '#f1f5f9', border: '#64748b', text: '#0f172a' },
                      cancelled: { bg: '#fff1f2', border: '#f43f5e', text: '#881337' }
                    };
                    const s = (booking.status || 'pending').toLowerCase();
                    // Fallback to employee color if unknown status, or just use pending logic?
                    // User requested "Mirror", assuming system has these statuses. 
                    // If unknown, we default to employee color for safety.
                    const styleColors = statusColors[s] || {
                      bg: `${member.calendar_color}15`,
                      border: member.calendar_color || '#4f46e5',
                      text: member.calendar_color || '#4f46e5'
                    };

                    return (
                      <div
                        key={booking.id}
                        onPointerDown={(e) => handlePointerDown(e, booking, 'drag')}
                        onClick={(e) => {
                          if (!isInteracting) setSelectedBooking(booking)
                        }}
                        className={cn(
                          "absolute rounded-xl border-l-4 p-2.5 text-left transition-none z-10 cursor-grab active:cursor-grabbing group/booking touch-none select-none",
                          shadow
                        )}
                        style={{
                          left: `${left}px`,
                          width: `${width}px`,
                          top: `${top}px`,
                          height: '64px', // h-16
                          backgroundColor: styleColors.bg,
                          borderColor: styleColors.border,
                          color: styleColors.text,
                          zIndex
                        }}
                      >
                        <div className="flex flex-col h-full justify-between overflow-hidden relative">
                          {/* Left Resize Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, booking, 'resize', 'left')}
                            className="absolute -left-2.5 top-0 bottom-0 w-8 cursor-ew-resize flex items-center justify-center group-hover/booking:opacity-100 opacity-0 transition-opacity z-20 touch-none"
                          >
                            <div className="w-1.5 h-8 bg-current opacity-40 rounded-full" />
                          </div>

                          <div className="flex items-center justify-between gap-1 pointer-events-none">
                            <span className="text-[10px] font-black uppercase truncate">
                              {booking.property_name}
                            </span>
                            <Badge className="h-4 px-1 text-[8px] uppercase font-bold bg-white/50 border-current" variant="outline">
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-bold opacity-80 pointer-events-none">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="bg-white/50 px-1 rounded">R${booking.price}</span>
                          </div>

                          {/* Right Resize Handle */}
                          <div
                            onPointerDown={(e) => handlePointerDown(e, booking, 'resize', 'right')}
                            className="absolute -right-2.5 top-0 bottom-0 w-8 cursor-ew-resize flex items-center justify-center group-hover/booking:opacity-100 opacity-0 transition-opacity z-20 touch-none"
                          >
                            <div className="w-1.5 h-8 bg-current opacity-40 rounded-full" />
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
