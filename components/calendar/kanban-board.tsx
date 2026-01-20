'use client'

import * as React from 'react'
import { updateBookingStatus } from '@/app/(dashboard)/calendar/actions'
import { 
  Clock, 
  MapPin, 
  User, 
  MoreHorizontal, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  Truck,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const COLUMNS = [
  { id: 'pending', title: 'Pendente', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'confirmed', title: 'Confirmado', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'in_route', title: 'Em Rota', icon: Truck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'completed', title: 'Concluído', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
]

export function KanbanBoard({ initialBookings }: { initialBookings: any[] }) {
  const [bookings, setBookings] = React.useState(initialBookings)

  const moveTask = async (bookingId: string, currentStatus: string, direction: 'next' | 'prev') => {
    const statusOrder = COLUMNS.map(c => c.id)
    const currentIndex = statusOrder.indexOf(currentStatus)
    let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    
    if (nextIndex < 0 || nextIndex >= statusOrder.length) return

    const newStatus = statusOrder[nextIndex]
    
    // Update local UI
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: newStatus } : b))

    // Update DB
    const res = await updateBookingStatus(bookingId, newStatus)
    if (res?.error) {
      alert("Erro ao atualizar: " + res.error)
      setBookings(initialBookings) // Revert on error
    }
  }

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((column) => (
        <div key={column.id} className="flex min-w-[320px] flex-1 flex-col gap-4 rounded-xl bg-slate-100/50 p-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <column.icon size={18} className={column.color} />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">{column.title}</h3>
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-500 shadow-sm border">
              {bookings.filter(b => b.status === column.id).length}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar">
            {bookings
              .filter(b => b.status === column.id)
              .map((booking) => (
                <div 
                  key={booking.id} 
                  className="group relative flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 leading-tight">{booking.property_name}</h4>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <User size={12} />
                        {booking.customers?.name || 'Cliente'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal size={16} />
                    </Button>
                  </div>

                  <div className="flex items-center gap-4 border-t pt-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <Clock size={14} className="text-indigo-500" />
                      {booking.time.slice(0, 5)}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <MapPin size={14} className="text-rose-500" />
                      {new Date(booking.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t pt-3">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 disabled:opacity-30" 
                      disabled={column.id === 'pending'}
                      onClick={() => moveTask(booking.id, booking.status, 'prev')}
                    >
                      <ChevronLeft size={16} />
                    </Button>
                    <div className="text-xs font-bold text-indigo-600">
                      R$ {booking.price}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 disabled:opacity-30" 
                      disabled={column.id === 'completed'}
                      onClick={() => moveTask(booking.id, booking.status, 'next')}
                    >
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}