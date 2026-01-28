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

const START_HOUR = 0
const END_HOUR = 23
const HOUR_WIDTH = 120 // pixels per hour
const SLOT_DURATION = 1 // 1-minute precision for ultra-smooth drag
const SNAP_PIXELS = (SLOT_DURATION / 60) * HOUR_WIDTH // 2px for 1min snap
export function DispatchTimeline({ date, employees, bookings, onBookingUpdate }: DispatchTimelineProps) {
  const [selectedBooking, setSelectedBooking] = React.useState<Booking | null>(null)
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const containerRef = React.useRef<HTMLDivElement>(null)
  const rowRefs = React.useRef<Map<string, HTMLDivElement>>(new Map())

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

  // Update current time every minute
  React.useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll logic during drag
  React.useEffect(() => {
    if (!interaction || !containerRef.current) return

    const scrollContainer = containerRef.current
    const edgeThreshold = 100
    const scrollSpeed = 15

    const interval = setInterval(() => {
      const { clientX } = interaction
      const { left, right } = scrollContainer.getBoundingClientRect()

      if (clientX < left + edgeThreshold) {
        scrollContainer.scrollLeft -= scrollSpeed
      } else if (clientX > right - edgeThreshold) {
        scrollContainer.scrollLeft += scrollSpeed
      }
    }, 30)

    return () => clearInterval(interval)
  }, [interaction])

  const hours = Array.from({ length: 24 }, (_, i) => i)

  const unassignedBookings = bookings.filter(b => (b.resource_ids || []).length === 0)
  const assignedBookings = bookings.filter(b => (b.resource_ids || []).length > 0)

  const getXPosition = (timeStr: string) => {
    const start = parseISO(timeStr)
    const viewStart = startOfDay(date)
    const diff = differenceInMinutes(start, viewStart)
    return (diff / 60) * HOUR_WIDTH
  }

  const getWidth = (startStr: string, endStr?: string | null) => {
    const start = parseISO(startStr)
    const end = endStr ? parseISO(endStr) : addMinutes(start, 60) // Default 1h if null
    const diff = differenceInMinutes(end, start)
    return (diff / 60) * HOUR_WIDTH
  }

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
            const viewStart = startOfDay(date)
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

  const nowPosition = getXPosition(currentTime.toISOString())

  return (
    <div className="flex h-full bg-slate-100/50 gap-4 p-4 overflow-hidden">
      {/* 1. Unassigned Jobs Tray (Fila de Espera) */}
      <div className="w-80 flex flex-col bg-white border rounded-2xl shadow-xl overflow-hidden shrink-0">
        <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <h2 className="font-black text-xs uppercase tracking-widest text-slate-500">
              Fila de Jobs ({unassignedBookings.length})
            </h2>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold border-slate-200">
            Aguardando
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {unassignedBookings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-100 rounded-xl">
              <ClipboardList className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-tight">Sem jobs pendentes</p>
            </div>
          ) : (
            unassignedBookings.map(booking => (
              <div
                key={booking.id}
                onPointerDown={(e) => handlePointerDown(e, booking, 'drag')}
                className="group relative bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-900 truncate pr-2">
                    {booking.property_name}
                  </span>
                  <Badge className="h-4 px-1 text-[8px] uppercase font-bold bg-amber-50 text-amber-600 border-amber-200">
                    PENDENTE
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-indigo-400" />
                    {parseISO(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-emerald-600 font-black">R${booking.price}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Main Timeline Board */}
      <div className="flex-1 relative flex flex-col bg-white border rounded-2xl shadow-xl overflow-hidden">
        {/* Main Single Scroll Container for both H and V */}
        <div ref={containerRef} className="flex-1 overflow-auto custom-scrollbar">
          <div className="min-w-[3104px] relative"> {/* 2880px (24h) + 224px (w-56) */}

            {/* Real-time "Now" Indicator */}
            <div
              className="absolute top-0 bottom-0 z-40 border-l-2 border-rose-500 pointer-events-none transition-all duration-1000"
              style={{ left: `${224 + nowPosition}px` }}
            >
              <div className="absolute top-0 -left-[5px] w-[10px] h-[10px] bg-rose-500 rounded-full shadow-lg" />
              <div className="absolute top-0 -left-6 bg-rose-500 text-white text-[8px] font-bold px-1 rounded shadow-md uppercase">
                Agora
              </div>
            </div>

            {/* Timeline Header (Sticky Top) */}
            <div className="flex bg-slate-50/80 sticky top-0 z-30 border-b">
              <div className="w-56 p-4 border-r shrink-0 font-bold text-xs text-slate-500 uppercase tracking-widest bg-white sticky left-0 z-40">
                Equipe Operacional
              </div>
              <div className="flex flex-1">
                {hours.map(hour => (
                  <div key={hour} className="min-w-[120px] p-3 text-center border-r last:border-0 border-slate-200 bg-slate-50/50">
                    <span className="text-[10px] font-black text-slate-400">
                      {hour}:00
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid Content */}
            <div className="relative">
              {employees.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  Nenhum funcionário ativo encontrado para este Tenant.
                </div>
              ) : (
                employees.map(member => {
                  const memberBookings = assignedBookings
                    .filter(b => b.resource_ids?.includes(member.id))
                    .sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())

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
                          "flex-1 relative h-24 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)] bg-[size:120px_100%] transition-colors touch-none"
                        )}
                      >
                        {/* Minor grid lines (30 min) */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_59px,#f8fafc_1px,transparent_60px)] bg-[size:120px_100%] opacity-50 pointer-events-none" />

                        {/* Event Blocks */}
                        {memberBookings.map((booking, idx) => {
                          const isInteracting = interaction?.bookingId === booking.id
                          const isOriginalBeingDragged = isInteracting && interaction?.type === 'drag'

                          // Base geometry
                          let left = getXPosition(booking.start_time)
                          let width = getWidth(booking.start_time, booking.end_time)

                          // Conflict Detection (check against next booking)
                          const nextBooking = memberBookings[idx + 1]
                          const hasConflict = nextBooking && parseISO(nextBooking.start_time) < (booking.end_time ? parseISO(booking.end_time) : addMinutes(parseISO(booking.start_time), 60))

                          // Interaction calculations
                          let top = 16
                          let ghostLeft = left
                          let ghostTop = top
                          let zIndex = 10
                          let shadow = 'shadow-lg'
                          let liveTimeLabel = ""

                          if (isInteracting) {
                            zIndex = 50
                            shadow = 'shadow-2xl ring-2 ring-indigo-400/50 scale-[1.02]'
                            const deltaX = interaction.currentX - interaction.startX
                            const deltaY = interaction.currentY - interaction.startY

                            if (interaction.type === 'resize') {
                              if (interaction.resizeSide === 'right') {
                                width = Math.max(HOUR_WIDTH * (SLOT_DURATION / 60), width + deltaX)
                              } else {
                                left = left + deltaX
                                width = Math.max(HOUR_WIDTH * (SLOT_DURATION / 60), width - deltaX)
                              }
                            } else {
                              // Drag Visuals (Ghost following mouse precisely)
                              ghostLeft = left + deltaX
                              ghostTop = top + deltaY

                              // Snap prediction for label
                              const snappedDelta = Math.round(deltaX / SNAP_PIXELS) * SNAP_PIXELS
                              const start = parseISO(booking.start_time)
                              const addedMins = (snappedDelta / HOUR_WIDTH) * 60
                              const predictedStart = addMinutes(start, addedMins)
                              liveTimeLabel = predictedStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            }
                          }

                          const statusColors: any = {
                            pending: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
                            confirmed: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
                            completed: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
                            cancelled: { bg: '#ffedd5', border: '#f97316', text: '#9a3412' }
                          };
                          const s = (booking.status || 'pending').toLowerCase();
                          const styleColors = statusColors[s] || statusColors.pending;

                          const CardContent = (isGhost = false) => (
                            <div
                              className={cn(
                                "absolute rounded-xl border-l-4 p-2.5 text-left transition-none cursor-grab active:cursor-grabbing group/booking touch-none select-none",
                                isGhost ? "shadow-2xl ring-4 ring-indigo-500/30 z-[60]" : shadow,
                                !isGhost && hasConflict && "ring-2 ring-rose-500 ring-offset-2",
                                !isGhost && isOriginalBeingDragged && "opacity-30 border-dashed"
                              )}
                              style={{
                                left: `${isGhost ? ghostLeft : left}px`,
                                width: `${width}px`,
                                top: `${isGhost ? ghostTop : top}px`,
                                height: '64px',
                                backgroundColor: styleColors.bg,
                                borderColor: hasConflict && !isGhost ? '#ef4444' : styleColors.border,
                                color: styleColors.text,
                                zIndex: isGhost ? 60 : zIndex,
                                pointerEvents: isGhost ? 'none' : 'auto'
                              }}
                            >
                              <div className="flex flex-col h-full justify-between overflow-hidden relative">
                                {/* Live Time Tooltip */}
                                {isGhost && liveTimeLabel && (
                                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-xl flex items-center gap-1 border border-white/20 whitespace-nowrap">
                                    <Clock size={10} className="text-amber-400" />
                                    {liveTimeLabel}
                                  </div>
                                )}

                                {hasConflict && !isGhost && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center animate-bounce z-30">
                                    <span className="text-[8px] text-white font-black">!</span>
                                  </div>
                                )}

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
                                    {parseISO(booking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="bg-white/50 px-1 rounded text-emerald-700 font-bold">R${booking.price}</span>
                                </div>

                                <div
                                  onPointerDown={(e) => handlePointerDown(e, booking, 'resize', 'right')}
                                  className="absolute -right-2.5 top-0 bottom-0 w-8 cursor-ew-resize flex items-center justify-center group-hover/booking:opacity-100 opacity-0 transition-opacity z-20 touch-none"
                                >
                                  <div className="w-1.5 h-8 bg-current opacity-40 rounded-full" />
                                </div>
                              </div>
                            </div>
                          );

                          return (
                            <React.Fragment key={booking.id}>
                              <div
                                onPointerDown={(e) => handlePointerDown(e, booking, 'drag')}
                                onClick={(e) => {
                                  if (!isInteracting) setSelectedBooking(booking)
                                }}
                              >
                                {CardContent(false)}
                              </div>
                              {isOriginalBeingDragged && CardContent(true)}
                            </React.Fragment>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Booking Detail Sidebar */}
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
                      {parseISO(selectedBooking.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
